import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/jwt.js';
import { db } from '../db/index.js';
 
// Verifies the Bearer token and attaches the decoded payload as req.user.
// Mirrors the checks GET /api/auth/me previously did inline — extracted
// here so operators.js and tours.js can gate routes the same way.
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing or malformed Authorization header' });
  }
  const token = authHeader.slice('Bearer '.length);
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { userId, email, iat, exp }
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

// Operator-only actions are tied to the account type chosen at signup.
// Having a valid session is not enough to create or manage operator data.
export function requireOperatorAccount(req, res, next) {
  const user = db.prepare('SELECT account_type FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(401).json({ error: 'user not found' });
  if (user.account_type !== 'operator') {
    return res.status(403).json({ error: 'an operator account is required' });
  }
  next();
}


// Like requireAuth, but never rejects: if a valid Bearer token is present
// req.user is set, otherwise the request just continues anonymously. Used
// on public routes that behave slightly differently for a logged-in
// viewer (e.g. GET /api/tours/:id not counting the owner's own views).
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.slice('Bearer '.length), JWT_SECRET);
    } catch {
      /* invalid/expired token - treat as anonymous */
    }
  }
  next();
}
