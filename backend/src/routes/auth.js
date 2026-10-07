// Sign Up / Login API - added for Sprint 1's authentication requirement.
// Passwords are hashed with bcrypt; sessions use a signed JWT.
//
// Note: users created earlier via bookings.js/reviews.js "guest checkout"
// flow have a random placeholder password_hash, not a real bcrypt hash -
// those accounts can't log in through this route, which is expected. Only
// accounts created via /signup have real, working passwords.
 
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { signupSchema, loginSchema, updateMeSchema, changePasswordSchema, deleteAccountSchema } from '../lib/schemas.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { JWT_SECRET } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createImageUpload, UPLOADS_ROOT } from '../lib/uploads.js';
import fs from 'node:fs';
import path from 'node:path';
 
const router = Router();
const JWT_EXPIRES_IN = '7d';
const avatarUpload = createImageUpload('users');
 
router.post('/signup', validate(signupSchema), asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
 
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'a valid email address is required' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
 
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'an account with this email already exists' });
  }
 
  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), email, passwordHash);
 
  const user = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
 
  res.status(201).json({ user, token });
}));
 
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
 
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  // A non-string here used to make bcrypt.compare / the SQLite bind throw
  // inside this async handler and take the whole server down.
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password must be strings' });
  }
 
  // lower(email) so accounts created before normalization (mixed case) can still log in.
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'invalid email or password' });
  }
 
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'invalid email or password' });
  }
 
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const { password_hash, ...safeUser } = user;
 
  res.json({ user: safeUser, token });
}));
 
// Every column the account settings page reads. Never includes password_hash.
const ME_FIELDS = `id, name, first_name, last_name, email, id_number, phone, country,
  preferred_language, photo_url, password_changed_at, created_at`;

// Accounts created before first/last name existed only have `name`; split it
// on the first space so the form starts filled in rather than blank.
function selectMe(id) {
  const user = db.prepare(`SELECT ${ME_FIELDS} FROM users WHERE id = ?`).get(id);
  if (user && !user.first_name && !user.last_name) {
    const [first, ...rest] = (user.name ?? '').trim().split(/\s+/);
    user.first_name = first ?? '';
    user.last_name = rest.join(' ');
  }
  return user;
}

const signToken = (user) => jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// "Who am I" - lets the frontend check login state from a stored token.
router.get('/me', requireAuth, (req, res) => {
  const user = selectMe(req.user.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ user });
});

// Update the logged-in account's own details - all optional, partial update.
// Identity comes only from the verified token, never the body. A fresh token
// is issued on every successful update since the JWT payload carries email.
// id_number ("Sənədlərim") is the traveler's saved ID card number; sending an
// empty string clears it (same for phone, country and last name).
router.put('/me', requireAuth, validate(updateMeSchema), asyncHandler(async (req, res) => {
  const { name, first_name, last_name, email, password, id_number, phone, country, preferred_language } = req.body;

  // Changing the password must prove the current one - see PUT /me/password.
  if (password !== undefined) {
    return res.status(400).json({ error: 'use PUT /api/auth/me/password to change the password' });
  }

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!current) return res.status(404).json({ error: 'user not found' });

  if (email !== undefined && email !== current.email) {
    const taken = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(email, current.id);
    if (taken) return res.status(409).json({ error: 'an account with this email already exists' });
  }

  const orNull = (value) => (value ? value : null);
  const updated = {
    first_name: first_name !== undefined ? first_name : current.first_name,
    last_name: last_name !== undefined ? orNull(last_name) : current.last_name,
    email: email !== undefined ? email : current.email,
    id_number: id_number !== undefined ? orNull(id_number.trim()) : current.id_number,
    phone: phone !== undefined ? orNull(phone) : current.phone,
    country: country !== undefined ? orNull(country) : current.country,
    preferred_language: preferred_language !== undefined ? preferred_language : current.preferred_language,
  };
  // `name` follows first/last name when either was sent; otherwise a plain
  // `name` update (older clients) still works on its own.
  updated.name =
    first_name !== undefined || last_name !== undefined
      ? [updated.first_name, updated.last_name].filter(Boolean).join(' ') || current.name
      : name !== undefined ? name : current.name;

  db.prepare(
    `UPDATE users SET name = ?, first_name = ?, last_name = ?, email = ?, id_number = ?, phone = ?, country = ?,
       preferred_language = ? WHERE id = ?`
  ).run(updated.name, updated.first_name, updated.last_name, updated.email, updated.id_number, updated.phone,
    updated.country, updated.preferred_language, current.id);

  const user = selectMe(current.id);
  res.json({ user, token: signToken(user) });
}));

// Change password from account settings. Requires the current password, so a
// stolen session token alone can't be used to take the account over.
router.put('/me/password', requireAuth, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const current = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.userId);
  if (!current) return res.status(404).json({ error: 'user not found' });

  if (!(await bcrypt.compare(current_password, current.password_hash))) {
    return res.status(401).json({ error: 'current password is incorrect' });
  }
  if (await bcrypt.compare(new_password, current.password_hash)) {
    return res.status(400).json({ error: 'new password must be different from the current one' });
  }

  db.prepare("UPDATE users SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ?")
    .run(await bcrypt.hash(new_password, 10), current.id);
  const user = selectMe(current.id);
  res.json({ user, token: signToken(user) });
}));

// Profile photo. Multipart field "photo"; jpg/png/webp up to 5 MB, verified
// by magic bytes in lib/uploads.js. The previous upload is deleted.
function removeOwnPhoto(photoUrl) {
  if (!photoUrl?.startsWith('/uploads/users/')) return;
  fs.unlink(path.join(UPLOADS_ROOT, 'users', path.basename(photoUrl)), () => {});
}

router.post('/me/photo', requireAuth, avatarUpload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'a valid image file is required' });
  const current = db.prepare('SELECT photo_url FROM users WHERE id = ?').get(req.user.userId);
  if (!current) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: 'user not found' });
  }
  db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(`/uploads/users/${req.file.filename}`, req.user.userId);
  removeOwnPhoto(current.photo_url);
  res.json({ user: selectMe(req.user.userId) });
});

router.delete('/me/photo', requireAuth, (req, res) => {
  const current = db.prepare('SELECT photo_url FROM users WHERE id = ?').get(req.user.userId);
  if (!current) return res.status(404).json({ error: 'user not found' });
  db.prepare('UPDATE users SET photo_url = NULL WHERE id = ?').run(req.user.userId);
  removeOwnPhoto(current.photo_url);
  res.json({ user: selectMe(req.user.userId) });
});

// Permanently delete the account with its booking history, reviews, saved
// tours, saved trips and notifications. Requires the password. Refused while
// the account still has an upcoming active booking (the operator is counting
// on those seats - cancelling first also handles any refund) or owns an
// operator profile (its tours and their travelers' bookings depend on it).
router.delete('/me', requireAuth, validate(deleteAccountSchema), asyncHandler(async (req, res) => {
  const current = db.prepare('SELECT id, password_hash, photo_url FROM users WHERE id = ?').get(req.user.userId);
  if (!current) return res.status(404).json({ error: 'user not found' });
  if (!(await bcrypt.compare(req.body.password, current.password_hash))) {
    return res.status(401).json({ error: 'password is incorrect' });
  }

  if (db.prepare('SELECT 1 FROM operators WHERE user_id = ?').get(current.id)) {
    return res.status(409).json({ error: 'operator accounts cannot be deleted here', code: 'operator_profile' });
  }
  const upcoming = db
    .prepare(
      `SELECT COUNT(*) AS n FROM bookings b JOIN tours t ON t.id = b.tour_id
       WHERE b.user_id = ? AND b.status IN ('pending', 'confirmed') AND date(t.date) >= date('now')`
    )
    .get(current.id).n;
  if (upcoming > 0) {
    return res.status(409).json({ error: 'cancel your upcoming bookings first', code: 'upcoming_bookings', count: upcoming });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)').run(current.id);
    for (const table of ['bookings', 'reviews', 'favorites', 'saved_trips', 'notifications']) {
      db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(current.id);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(current.id);
  })();
  removeOwnPhoto(current.photo_url);
  res.status(204).end();
}));

export default router;