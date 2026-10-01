// Import this FIRST in every test file. It points the app at a throwaway
// database and uploads folder before src/db/index.js and src/lib/uploads.js
// read their env vars at import time. node:test runs each file in its own
// process, so every test file gets a fresh, empty database.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'turpoint-test-'));

process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(dir, 'test.db');
process.env.UPLOADS_DIR = path.join(dir, 'uploads');
process.env.JWT_SECRET = 'test-only-secret';

export function cleanup(db) {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

let counter = 0;

// Creates a real account through the API and returns { token, user, email }.
export async function signup(request, app, overrides = {}) {
  counter += 1;
  const email = overrides.email ?? `user${counter}@example.com`;
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test User', email, password: 'secret123', ...overrides });
  if (res.status !== 201) {
    throw new Error(`signup helper failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, email };
}
