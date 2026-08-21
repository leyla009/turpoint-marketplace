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
 
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-before-real-deployment';
const JWT_EXPIRES_IN = '7d';
 
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
 
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
 
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'an account with this email already exists' });
  }
 
  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);
 
  const user = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
 
  res.status(201).json({ user, token });
});
 
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
 
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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
});
 
// "Who am I" - lets the frontend check login state from a stored token.
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing or malformed Authorization header' });
  }
  const token = authHeader.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
      .get(decoded.userId);
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
});
 
export default router;
