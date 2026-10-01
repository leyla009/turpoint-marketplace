// Sign Up / Login API - added for Sprint 1's authentication requirement.
// Passwords are hashed with bcrypt; sessions use a signed JWT.
//
// Note: users created earlier via bookings.js/reviews.js "guest checkout"
// flow have a random placeholder password_hash, not a real bcrypt hash -
// those accounts can't log in through this route, which is expected. Only
// accounts created via /signup have real, working passwords.
 
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { JWT_SECRET } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
 
const router = Router();
const JWT_EXPIRES_IN = '7d';
 
router.post('/signup', asyncHandler(async (req, res) => {
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
 
router.post('/login', asyncHandler(async (req, res) => {
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
 
// "Who am I" - lets the frontend check login state from a stored token.
router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, name, email, id_number, created_at FROM users WHERE id = ?')
    .get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ user });
});

// Update the logged-in account's own name/email/password/id_number - all
// optional, partial update, same pattern as PUT /api/operators/:id and PUT
// /api/tours/:id. Identity comes only from the verified token, never the
// body. A fresh token is issued on every successful update since the JWT
// payload carries email - without this, a changed email would leave the
// client holding a token with a now-stale email claim until it expires.
// id_number ("Sənədlərim") is the traveler's saved ID card number, kept on
// file so it doesn't need to be retyped for every reservation - sending an
// empty string clears it.
router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const { name, password, id_number } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;

  for (const [field, value] of Object.entries({ name, email, password, id_number })) {
    if (value !== undefined && typeof value !== 'string') {
      return res.status(400).json({ error: `${field} must be a string` });
    }
  }
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }
  if (email !== undefined && !email.trim()) {
    return res.status(400).json({ error: 'email cannot be empty' });
  }
  if (password !== undefined && password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!current) return res.status(404).json({ error: 'user not found' });

  if (email !== undefined && email !== current.email) {
    const taken = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(email, current.id);
    if (taken) return res.status(409).json({ error: 'an account with this email already exists' });
  }

  const updated = {
    name: name !== undefined ? name : current.name,
    email: email !== undefined ? email : current.email,
    password_hash: password !== undefined ? await bcrypt.hash(password, 10) : current.password_hash,
    id_number: id_number !== undefined ? (id_number.trim() || null) : current.id_number,
  };

  db.prepare('UPDATE users SET name = ?, email = ?, password_hash = ?, id_number = ? WHERE id = ?')
    .run(updated.name, updated.email, updated.password_hash, updated.id_number, current.id);

  const user = db
    .prepare('SELECT id, name, email, id_number, created_at FROM users WHERE id = ?')
    .get(current.id);
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.json({ user, token });
}));

export default router;