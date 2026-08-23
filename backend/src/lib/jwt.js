// Shared JWT secret used by both the auth routes and the requireAuth
// middleware, so a token issued by one is always verifiable by the other.
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-before-real-deployment';
