import { cleanup, signup } from './helpers.js';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { db } from '../src/db/index.js';

after(() => cleanup(db));

describe('POST /api/auth/signup', () => {
  it('creates an account and returns a token without leaking the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Leyla', email: 'Leyla@Example.com', password: 'secret123' });

    assert.equal(res.status, 201);
    assert.equal(typeof res.body.token, 'string');
    assert.equal(res.body.user.email, 'leyla@example.com'); // normalised to lowercase
    assert.equal(res.body.user.password_hash, undefined);
  });

  it('rejects a duplicate email with 409', async () => {
    await signup(request, app, { email: 'dupe@example.com' });
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Other', email: 'DUPE@example.com', password: 'secret123' });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'an account with this email already exists');
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Short', email: 'short@example.com', password: 'abc' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'password must be at least 6 characters');
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for the right password', async () => {
    const { email } = await signup(request, app);
    const res = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });

    assert.equal(res.status, 200);
    assert.equal(typeof res.body.token, 'string');
    assert.equal(res.body.user.password_hash, undefined);
  });

  it('returns 401 for a wrong password', async () => {
    const { email } = await signup(request, app);
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  it('rejects a tampered token', async () => {
    const { token } = await signup(request, app);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}x`);
    assert.equal(res.status, 401);
  });

  it('returns the logged-in user for a valid token', async () => {
    const { token, email } = await signup(request, app);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, email);
  });
});
