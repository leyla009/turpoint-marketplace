
// Task 6: Operator profile create/read/update.
// Operator/traveler dual-mode account model: an operator profile is now
// owned by the user account that created it (user_id). Creating or
// editing a profile requires a valid session; ownership is always
// derived from the verified token, never trusted from the request body.

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createOperatorSchema, updateOperatorSchema } from '../lib/schemas.js';
import { db } from '../db/index.js';
import { requireAuth, requireOperatorAccount } from '../middleware/auth.js';
import { normalizeInstagram } from '../lib/instagram.js';
import { buildOperatorAnalytics } from '../lib/analytics.js';
import { createImageUpload } from '../lib/uploads.js';

const router = Router();
const upload = createImageUpload('operators');

// Columns that must never leave the server: the pending SMS code/number/
// expiry (anyone could read a live code off the public list) and the owning
// account id. `phone` stays public on purpose - it is the operator's
// business contact number shown on their tours.
function publicOperator(row) {
  if (!row) return row;
  const {
    phone_verification_code,
    phone_verification_phone,
    phone_verification_expires_at,
    user_id,
    ...safe
  } = row;
  return safe;
}

// /me is the owner's own record, so user_id is fine there - but the pending
// code is still never returned.
function ownOperator(row) {
  if (!row) return row;
  const { phone_verification_code, phone_verification_phone, phone_verification_expires_at, ...safe } = row;
  return safe;
}

// Azerbaijan mobile numbers are always +994 followed by exactly 9 digits
// (e.g. +994 50 123 45 67) - the profile form fixes the +994 prefix and
// caps the rest at 9 digits to match.
function isValidPhone(phone) {
  return /^\+994\d{9}$/.test(phone);
}

// Phone verification. There is no SMS provider wired up yet, so the only
// available mode is a MOCK that accepts a fixed code. That is fine for local
// development but would let anyone mark any number "verified" in
// production, so:
//   - outside production the mock works as before (fixed dev code);
//   - in production the endpoints answer 501 unless the deployer explicitly
//     opts in with ALLOW_MOCK_PHONE_VERIFICATION=true (demo deployments).
// When a real provider is added, replace sendCode()/checkCode() below with a
// random per-request code and the provider call; the pending-code columns,
// expiry and reset-on-phone-change logic already support that.
const DEV_VERIFICATION_CODE = '123456';
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const mockVerificationAllowed =
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PHONE_VERIFICATION === 'true';

function requireVerificationProvider(req, res, next) {
  if (!mockVerificationAllowed) {
    return res.status(501).json({ error: 'phone verification is not available yet' });
  }
  next();
}

// In-memory only: resets on restart, which merely gives a fresh set of tries.
const verifyAttempts = new Map(); // operatorId -> failed attempts for the pending code

router.post('/', requireAuth, requireOperatorAccount, validate(createOperatorSchema), (req, res) => {
  const { name, description, languages, photo_url, phone, instagram } = req.body;
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'a valid phone number starting with +994 is required' });
  }

  const existing = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (existing) {
    return res.status(409).json({ error: 'you already have an operator profile — use PUT to update it' });
  }

  const result = db
    .prepare(
      `INSERT INTO operators (name, description, languages, photo_url, phone, instagram, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, description ?? null, languages ?? null, photo_url ?? null, phone, normalizeInstagram(instagram), req.user.userId);

  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(ownOperator(operator));
});

// "Do I have an operator profile?" — this is what drives the
// Traveler/Operator toggle on the frontend. Returns null (not a 404)
// when the answer is no, since that's a normal state, not an error.
// Must be declared before GET /:id, or Express would match "me" as :id.
router.get('/me', requireAuth, (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  res.json(ownOperator(operator) ?? null);
});

// Operator analytics for the dashboard: revenue, bookings, fill rate, views
// and per-tour performance, scoped to the logged-in operator's own tours
// (ownership comes from the verified token, never from a query param).
// Must be declared before GET /:id, or Express would match "me" as :id.
router.get('/me/analytics', requireAuth, requireOperatorAccount, (req, res) => {
  const operator = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(404).json({ error: 'create your operator profile first' });
  res.json(buildOperatorAnalytics(db, operator.id));
});

// Profile photo upload - separate from PUT /:id since that route takes a
// plain JSON body, not multipart. Only for an operator profile that
// already exists (create it first via POST /, then add a photo).
router.post('/me/photo', requireAuth, requireOperatorAccount, upload.single('photo'), (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(404).json({ error: 'create your operator profile first' });
  if (!req.file) return res.status(400).json({ error: 'a valid image file is required' });

  const photoUrl = `/uploads/operators/${req.file.filename}`;
  db.prepare('UPDATE operators SET photo_url = ? WHERE id = ?').run(photoUrl, operator.id);
  res.json(ownOperator(db.prepare('SELECT * FROM operators WHERE id = ?').get(operator.id)));
});

// Sends (mocked - see DEV_VERIFICATION_CODE above) a verification code for
// a phone number, ahead of it being saved as the operator's real phone -
// so the number can be confirmed before it's committed to the profile.
router.post('/me/phone/send-code', requireAuth, requireOperatorAccount, requireVerificationProvider, (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(404).json({ error: 'create your operator profile first' });

  const { phone } = req.body;
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'a valid phone number starting with +994 is required' });
  }

  // Cooldown: an existing pending code was issued at (expiry - TTL).
  if (operator.phone_verification_expires_at) {
    const issuedAt = new Date(operator.phone_verification_expires_at).getTime() - VERIFICATION_CODE_TTL_MS;
    if (Date.now() - issuedAt < SEND_COOLDOWN_MS) {
      return res.status(429).json({ error: 'please wait a minute before requesting another code' });
    }
  }

  verifyAttempts.delete(operator.id);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();
  db.prepare(
    'UPDATE operators SET phone_verification_code = ?, phone_verification_phone = ?, phone_verification_expires_at = ? WHERE id = ?'
  ).run(DEV_VERIFICATION_CODE, phone, expiresAt, operator.id);

  if (process.env.NODE_ENV !== 'production') console.log(`[dev] verification code for ${phone}: ${DEV_VERIFICATION_CODE}`);
  res.json({ ok: true });
});

// Confirms the code from send-code above. On success, the pending phone
// number becomes the operator's actual phone and is marked verified -
// this is the only place phone_verified is ever set to true.
router.post('/me/phone/verify-code', requireAuth, requireOperatorAccount, requireVerificationProvider, (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(404).json({ error: 'create your operator profile first' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'a code is required' });
  if (!operator.phone_verification_code || !operator.phone_verification_phone) {
    return res.status(400).json({ error: 'no pending verification - send a code first' });
  }
  if (new Date(operator.phone_verification_expires_at) < new Date()) {
    return res.status(400).json({ error: 'this code has expired - send a new one' });
  }
  if ((verifyAttempts.get(operator.id) ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    return res.status(429).json({ error: 'too many incorrect attempts - request a new code' });
  }
  if (String(code) !== operator.phone_verification_code) {
    verifyAttempts.set(operator.id, (verifyAttempts.get(operator.id) ?? 0) + 1);
    return res.status(400).json({ error: 'incorrect code' });
  }
  verifyAttempts.delete(operator.id);

  db.prepare(
    `UPDATE operators SET phone = ?, phone_verified = 1,
       phone_verification_code = NULL, phone_verification_phone = NULL, phone_verification_expires_at = NULL
     WHERE id = ?`
  ).run(operator.phone_verification_phone, operator.id);

  res.json(ownOperator(db.prepare('SELECT * FROM operators WHERE id = ?').get(operator.id)));
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM operators ORDER BY rating DESC').all().map(publicOperator));
});

router.get('/:id', (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!operator) return res.status(404).json({ error: 'operator not found' });
  res.json(publicOperator(operator));
});

router.put('/:id', requireAuth, requireOperatorAccount, validate(updateOperatorSchema), (req, res) => {
  const existing = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'operator not found' });
  if (existing.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only edit your own operator profile' });
  }

  // Only these fields are editable through this route. Merging the whole
  // body let a client overwrite rating, user_id, phone_verified, etc., and
  // `name: null` reached the NOT NULL column and returned a 500.
  const EDITABLE = ['name', 'description', 'languages', 'photo_url', 'vehicle_features', 'phone', 'instagram'];
  const updated = { ...existing };
  for (const key of EDITABLE) {
    if (req.body?.[key] !== undefined) updated[key] = req.body[key];
  }
  if (typeof updated.name !== 'string' || !updated.name.trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }
  updated.name = updated.name.trim();
  if (!updated.phone || !isValidPhone(updated.phone)) {
    return res.status(400).json({ error: 'a valid phone number starting with +994 is required' });
  }
  // Changing the phone number through the regular profile save (rather
  // than the verify-code flow) means it's no longer confirmed - only
  // POST /me/phone/verify-code is allowed to set this back to true.
  const phoneVerified = updated.phone === existing.phone ? existing.phone_verified : 0;

  db.prepare(
    `UPDATE operators SET name=?, description=?, languages=?, photo_url=?, vehicle_features=?, phone=?, phone_verified=?, instagram=? WHERE id=?`
  ).run(
    updated.name,
    updated.description,
    updated.languages,
    updated.photo_url,
    updated.vehicle_features,
    updated.phone,
    phoneVerified,
    normalizeInstagram(updated.instagram),
    req.params.id
  );

  res.json(ownOperator(db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id)));
});

export default router;
