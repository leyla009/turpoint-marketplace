import { cleanup } from './helpers.js';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { db } from '../src/db/index.js';
import { bootstrapDemo } from '../src/db/demoBootstrap.js';

after(() => cleanup(db));

const env = {
  AUTO_SEED_DEMO: 'true',
  DEMO_OPERATOR_PASSWORD: 'operator-pass-1',
  DEMO_TRAVELER_PASSWORD: 'abc', // too short: skipped, everything else still set up
  ADMIN_EMAILS: 'Boss@Example.com, other@example.com',
  ADMIN_PASSWORD: 'admin-pass-1',
};

describe('automatic demo setup on an empty database', () => {
  it('does nothing unless AUTO_SEED_DEMO=true', () => {
    assert.equal(bootstrapDemo({}), null);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tours').get().n, 0);
  });

  it('creates the showcase tours, deals and the logins that have valid passwords', async () => {
    const result = bootstrapDemo(env);
    assert.equal(result.added, db.prepare('SELECT COUNT(*) AS n FROM tours').get().n);
    assert.equal(result.deals, 5);
    assert.deepEqual(result.logins, ['operator.demo@turpoint.test (operator)', 'boss@example.com (admin)']);

    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tours WHERE date < ?').get(tomorrow).n, 0);
    assert.ok(db.prepare("SELECT COUNT(*) AS n FROM tours WHERE category = 'wellness'").get().n >= 4);

    const operator = await request(app).post('/api/auth/login').send({ email: 'operator.demo@turpoint.test', password: 'operator-pass-1' });
    assert.equal(operator.status, 200);
    const mine = await request(app).get('/api/operators/me').set('Authorization', `Bearer ${operator.body.token}`);
    assert.equal(mine.body.name, 'Azerbaijan Discovery (Demo)');

    const traveler = await request(app).post('/api/auth/login').send({ email: 'traveler.demo@turpoint.test', password: 'abc' });
    assert.equal(traveler.status, 401);
  });

  it('never touches a database that already has tours', () => {
    const before = db.prepare('SELECT COUNT(*) AS n FROM tours').get().n;
    assert.equal(bootstrapDemo(env), null);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tours').get().n, before);
  });
});
