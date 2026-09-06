// Shared JWT secret used by both the auth routes and the requireAuth
// middleware, so a token issued by one is always verifiable by the other.
// The dev-only fallback below is fine for localhost, but signing real
// production tokens with a secret that's public in this repo would let
// anyone forge a valid session - so a production boot without JWT_SECRET
// set fails loudly instead of silently shipping that hole.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production - see backend/.env.example');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-before-real-deployment';
