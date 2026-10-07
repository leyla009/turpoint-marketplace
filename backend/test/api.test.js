import { cleanup, signup } from './helpers.js';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { db } from '../src/db/index.js';

after(() => cleanup(db));

describe('basics', () => {
  it('GET /api/health answers ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('unknown routes return a JSON 404, not an HTML page', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'not found' });
  });
});

describe('tours', () => {
  it('GET /api/tours returns an empty list on a fresh database', async () => {
    const res = await request(app).get('/api/tours');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('POST /api/tours requires login', async () => {
    const res = await request(app).post('/api/tours').send({});
    assert.equal(res.status, 401);
  });

  it('POST /api/tours is refused for a traveler with no operator profile', async () => {
    const { token } = await signup(request, app);
    const res = await request(app)
      .post('/api/tours')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Quba day trip', price: 50, date: '2030-06-01' });

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'you need an operator profile before creating tours');
  });

  it('GET /api/tours/compare needs 2 or 3 ids', async () => {
    const res = await request(app).get('/api/tours/compare?ids=1');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'compare requires 2 or 3 ids');
  });
});

describe('bookings', () => {
  it('POST /api/bookings requires login (no guest checkout)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ tour_id: 1, seats: 1, payment: { card_number: '4242424242424242' } });
    assert.equal(res.status, 401);
  });

  it('POST /api/bookings returns 404 for a tour that does not exist', async () => {
    const { token } = await signup(request, app);
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ tour_id: 9999, seats: 1, payment: { card_number: '4242424242424242' } });

    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'tour not found');
  });
});

describe('tour gallery photos', () => {
  // Smallest thing lib/uploads.js accepts as a PNG: the 8-byte signature.
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

  it('only the owning operator can add/remove photos, and they come back on GET /api/tours/:id', async () => {
    const owner = await signup(request, app);
    const stranger = await signup(request, app);
    const operatorId = db
      .prepare('INSERT INTO operators (name, user_id) VALUES (?, ?)')
      .run('Gallery Tours', owner.user.id).lastInsertRowid;
    const tourId = db
      .prepare('INSERT INTO tours (operator_id, title, price, date) VALUES (?, ?, ?, ?)')
      .run(operatorId, 'Gallery tour', 40, '2030-06-01').lastInsertRowid;

    const denied = await request(app)
      .post(`/api/tours/${tourId}/photos`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .attach('photo', png, 'a.png');
    assert.equal(denied.status, 403);

    const added = await request(app)
      .post(`/api/tours/${tourId}/photos`)
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('photo', png, 'a.png');
    assert.equal(added.status, 201);
    assert.equal(added.body.length, 1);
    assert.match(added.body[0].url, /^\/uploads\/tours\/.+\.png$/);

    const tour = await request(app).get(`/api/tours/${tourId}`);
    assert.deepEqual(tour.body.photos, added.body);

    const removed = await request(app)
      .delete(`/api/tours/${tourId}/photos/${added.body[0].id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    assert.equal(removed.status, 200);
    assert.deepEqual(removed.body, []);
  });

  it('GET /api/reviews?operator_id= lists reviews across that operator\'s tours', async () => {
    const res = await request(app).get('/api/reviews?operator_id=999');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });
});
