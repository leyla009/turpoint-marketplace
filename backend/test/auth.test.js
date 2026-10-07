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

describe('PUT /api/auth/me (account settings)', () => {
  it('saves first/last name, phone, country and language, and keeps name in sync', async () => {
    const { token } = await signup(request, app, { name: 'Vagif Rasulzade' });
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Vaqif', last_name: 'Rəsulzadə', phone: '+994501234567', country: 'AZ', preferred_language: 'en' });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'Vaqif Rəsulzadə');
    assert.equal(res.body.user.phone, '+994501234567');
    assert.equal(res.body.user.country, 'AZ');
    assert.equal(res.body.user.preferred_language, 'en');
  });

  it('splits a legacy name into first/last name on read', async () => {
    const { token } = await signup(request, app, { name: 'Leyla Mammadova Ali' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.body.user.first_name, 'Leyla');
    assert.equal(res.body.user.last_name, 'Mammadova Ali');
  });

  it('rejects a malformed phone number and a password change without the current password', async () => {
    const { token } = await signup(request, app);
    const bad = await request(app).put('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ phone: '12ab' });
    assert.equal(bad.status, 400);
    const pw = await request(app).put('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ password: 'newpass1!' });
    assert.equal(pw.status, 400);
  });
});

describe('PUT /api/auth/me/password', () => {
  it('needs the right current password and a strong new one, then records the change date', async () => {
    const { token, email } = await signup(request, app);
    const auth = { Authorization: `Bearer ${token}` };

    const wrong = await request(app).put('/api/auth/me/password').set(auth).send({ current_password: 'nope', new_password: 'Better#2026' });
    assert.equal(wrong.status, 401);
    const weak = await request(app).put('/api/auth/me/password').set(auth).send({ current_password: 'secret123', new_password: 'abcdefgh' });
    assert.equal(weak.status, 400);

    const ok = await request(app).put('/api/auth/me/password').set(auth).send({ current_password: 'secret123', new_password: 'Better#2026' });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.user.password_changed_at);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'Better#2026' });
    assert.equal(login.status, 200);
  });
});

describe('DELETE /api/auth/me', () => {
  it('requires the password, then removes the account', async () => {
    const { token, email } = await signup(request, app);
    const auth = { Authorization: `Bearer ${token}` };

    const wrong = await request(app).delete('/api/auth/me').set(auth).send({ password: 'nope' });
    assert.equal(wrong.status, 401);

    const ok = await request(app).delete('/api/auth/me').set(auth).send({ password: 'secret123' });
    assert.equal(ok.status, 204);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });
    assert.equal(login.status, 401);
  });
});
