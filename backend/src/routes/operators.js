
// Task 6: Operator profile create/read/update.
// Operator/traveler dual-mode account model: an operator profile is now
// owned by the user account that created it (user_id). Creating or
// editing a profile requires a valid session; ownership is always
// derived from the verified token, never trusted from the request body.

import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads/operators');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

// Azerbaijan mobile numbers are always +994 followed by exactly 9 digits
// (e.g. +994 50 123 45 67) - the profile form fixes the +994 prefix and
// caps the rest at 9 digits to match.
function isValidPhone(phone) {
  return /^\+994\d{9}$/.test(phone);
}

// Phone verification is mocked for now - there's no SMS provider wired up
// (would need a paid/free-tier account like Twilio or Vonage), so instead
// of generating and texting a real random code, "sending" a code just
// stores this fixed one. Swap this out for a real provider + a random
// per-request code once one is chosen; everything else (the pending-code
// columns, the expiry check, the reset-on-phone-change logic below) is
// already shaped to support that without further changes.
const DEV_VERIFICATION_CODE = '123456';
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

router.post('/', requireAuth, (req, res) => {
  const { name, description, languages, photo_url, phone, instagram } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
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
    .run(name, description ?? null, languages ?? null, photo_url ?? null, phone, instagram ?? null, req.user.userId);

  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(operator);
});

// "Do I have an operator profile?" — this is what drives the
// Traveler/Operator toggle on the frontend. Returns null (not a 404)
// when the answer is no, since that's a normal state, not an error.
// Must be declared before GET /:id, or Express would match "me" as :id.
router.get('/me', requireAuth, (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  res.json(operator ?? null);
});

// Profile photo upload - separate from PUT /:id since that route takes a
// plain JSON body, not multipart. Only for an operator profile that
// already exists (create it first via POST /, then add a photo).
router.post('/me/photo', requireAuth, upload.single('photo'), (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(404).json({ error: 'create your operator profile first' });
  if (!req.file) return res.status(400).json({ error: 'a valid image file is required' });

  const photoUrl = `/uploads/operators/${req.file.filename}`;
  db.prepare('UPDATE operators SET photo_url = ? WHERE id = ?').run(photoUrl, operator.id);
  res.json(db.prepare('SELECT * FROM operators WHERE id = ?').get(operator.id));
});

// Sends (mocked - see DEV_VERIFICATION_CODE above) a verification code for
// a phone number, ahead of it being saved as the operator's real phone -
// so the number can be confirmed before it's committed to the profile.
router.post('/me/phone/send-code', requireAuth, (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(404).json({ error: 'create your operator profile first' });

  const { phone } = req.body;
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'a valid phone number starting with +994 is required' });
  }

  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();
  db.prepare(
    'UPDATE operators SET phone_verification_code = ?, phone_verification_phone = ?, phone_verification_expires_at = ? WHERE id = ?'
  ).run(DEV_VERIFICATION_CODE, phone, expiresAt, operator.id);

  console.log(`[dev] verification code for ${phone}: ${DEV_VERIFICATION_CODE}`);
  res.json({ ok: true });
});

// Confirms the code from send-code above. On success, the pending phone
// number becomes the operator's actual phone and is marked verified -
// this is the only place phone_verified is ever set to true.
router.post('/me/phone/verify-code', requireAuth, (req, res) => {
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
  if (code !== operator.phone_verification_code) {
    return res.status(400).json({ error: 'incorrect code' });
  }

  db.prepare(
    `UPDATE operators SET phone = ?, phone_verified = 1,
       phone_verification_code = NULL, phone_verification_phone = NULL, phone_verification_expires_at = NULL
     WHERE id = ?`
  ).run(operator.phone_verification_phone, operator.id);

  res.json(db.prepare('SELECT * FROM operators WHERE id = ?').get(operator.id));
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM operators ORDER BY rating DESC').all());
});

router.get('/:id', (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!operator) return res.status(404).json({ error: 'operator not found' });
  res.json(operator);
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'operator not found' });
  if (existing.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only edit your own operator profile' });
  }

  const updated = { ...existing, ...req.body };
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
    updated.instagram,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id));
});

export default router;
