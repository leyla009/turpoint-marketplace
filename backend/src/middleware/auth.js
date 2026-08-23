import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/jwt.js';
 
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
