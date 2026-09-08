// Task 7: Tour create/list.
// Task 8: search & filters via query params.
// Task 14: /compare endpoint.
// Operator/traveler dual-mode account model: creating a tour now requires
// being logged in with an operator profile. operator_id is derived from
// that profile server-side - never trusted from the request body.
 
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads/tours');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];

// Mirrors the frontend's buildInterestScore (new-tour/page.tsx): the tour's
// own category gets a strong match weight, everything else a weak one. Used
// to keep interest_score in sync with category on the PUT handler below -
// the Smart Planner (planner.js) ranks tours by this field, so letting it
// go stale after a category edit would silently corrupt its ranking.
function buildInterestScore(category) {
  const score = {};
  for (const c of CATEGORIES) {
    score[c] = c === category ? 0.9 : 0.1;
  }
  return score;
}

// Task 15: attach discounted_price/active_deal wherever a tour (or list of
// tours) is returned. Was previously only applied on GET /:id, which meant
// GET /api/tours (the list/search endpoint) never surfaced deal pricing -
// silently breaking anything filtering or sorting by effective price on a
// list view (e.g. the homepage price filter). One query for all active
// deals, keyed by tour_id, so list endpoints stay O(1) queries instead of
// N+1.
export function attachActiveDeals(tours) {
  const list = Array.isArray(tours) ? tours : [tours];
  if (list.length === 0) return tours;
 
  const ids = list.map((t) => t.id);
  const placeholders = ids.map(() => '?').join(',');
  const activeDeals = db
    .prepare(
      `SELECT * FROM last_minute_deals
       WHERE tour_id IN (${placeholders}) AND datetime(expires_at) > datetime('now')
       ORDER BY discount_percent DESC`
    )
    .all(...ids);
 
  // Keep the highest-discount active deal per tour_id (matches the
  // ORDER BY ... LIMIT 1 behavior the single-tour lookup used).
  const bestDealByTourId = {};
  for (const deal of activeDeals) {
    if (!bestDealByTourId[deal.tour_id]) bestDealByTourId[deal.tour_id] = deal;
  }
 
  const withDeals = list.map((tour) => {
    const activeDeal = bestDealByTourId[tour.id];
    if (!activeDeal) return tour;
    const discountedPrice = Math.round(tour.price * (1 - activeDeal.discount_percent / 100) * 100) / 100;
    return { ...tour, discounted_price: discountedPrice, active_deal: activeDeal };
  });
 
  return Array.isArray(tours) ? withDeals : withDeals[0];
}

// Attaches rating/review_count aggregated straight from the reviews table,
// so tour cards and search results can show real review data instead of
// requiring a separate per-tour request. Same one-query-for-the-whole-list
// shape as attachActiveDeals, for the same reason (avoid N+1 on a list).
export function attachReviewStats(tours) {
  const list = Array.isArray(tours) ? tours : [tours];
  if (list.length === 0) return tours;

  const ids = list.map((t) => t.id);
  const placeholders = ids.map(() => '?').join(',');
  const stats = db
    .prepare(
      `SELECT tour_id, AVG(rating) as avgRating, COUNT(*) as reviewCount
       FROM reviews WHERE tour_id IN (${placeholders}) GROUP BY tour_id`
    )
    .all(...ids);

  const statsByTourId = {};
  for (const row of stats) statsByTourId[row.tour_id] = row;

  const withStats = list.map((tour) => {
    const row = statsByTourId[tour.id];
    return {
      ...tour,
      rating: row ? Math.round(row.avgRating * 10) / 10 : null,
      review_count: row ? row.reviewCount : 0,
    };
  });

  return Array.isArray(tours) ? withStats : withStats[0];
}

router.post('/', requireAuth, (req, res) => {
  const {
    title, description, location, category,
    price, date, duration_days, min_participants, max_participants, interest_score, features, vehicle_features,
  } = req.body;

  if (!title || !price || !date) {
    return res.status(400).json({ error: 'title, price, date are required' });
  }
  if (!(price > 0)) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }
  if (min_participants !== undefined && !(min_participants >= 1)) {
    return res.status(400).json({ error: 'min_participants must be at least 1' });
  }
  if (max_participants !== undefined && !(max_participants >= 1)) {
    return res.status(400).json({ error: 'max_participants must be at least 1' });
  }
  if (
    min_participants !== undefined &&
    max_participants !== undefined &&
    Number(min_participants) > Number(max_participants)
  ) {
    return res.status(400).json({ error: 'min_participants cannot exceed max_participants' });
  }

  const operator = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) {
    return res.status(403).json({ error: 'you need an operator profile before creating tours' });
  }
 
  const result = db
    .prepare(
      `INSERT INTO tours
        (operator_id, title, description, location, category, price, date,
         duration_days, min_participants, max_participants, interest_score, features, vehicle_features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      operator.id, title, description ?? null, location ?? null, category ?? null,
      price, date, duration_days ?? 1, min_participants ?? 1,
      max_participants ?? 10, interest_score ? JSON.stringify(interest_score) : null,
      features ?? null, vehicle_features ?? null
    );

  res.status(201).json(db.prepare('SELECT * FROM tours WHERE id = ?').get(result.lastInsertRowid));
});

// Tour photo upload - separate from PUT /:id since that route takes a
// plain JSON body, not multipart. Requires the tour to already exist
// (create it first via POST /, then add a photo) - same pattern as
// POST /api/operators/me/photo.
router.post('/:id/photo', requireAuth, upload.single('photo'), (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });

  const ownsIt = db
    .prepare('SELECT id FROM operators WHERE id = ? AND user_id = ?')
    .get(tour.operator_id, req.user.userId);
  if (!ownsIt) {
    return res.status(403).json({ error: 'you can only edit your own tours' });
  }
  if (!req.file) return res.status(400).json({ error: 'a valid image file is required' });

  const photoUrl = `/uploads/tours/${req.file.filename}`;
  db.prepare('UPDATE tours SET photo_url = ? WHERE id = ?').run(photoUrl, tour.id);
  res.json(attachActiveDeals(db.prepare('SELECT * FROM tours WHERE id = ?').get(tour.id)));
});

// Task 8: GET /api/tours?location=Quba&maxPrice=100&category=nature&fromDate=2026-09-01
router.get('/', (req, res) => {
  const { location, category, minPrice, maxPrice, fromDate, toDate } = req.query;
 
  let query = 'SELECT * FROM tours WHERE 1=1';
  const params = [];
 
  if (location) { query += ' AND location = ?'; params.push(location); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (minPrice) { query += ' AND price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { query += ' AND price <= ?'; params.push(Number(maxPrice)); }
  if (fromDate) { query += ' AND date >= ?'; params.push(fromDate); }
  if (toDate) { query += ' AND date <= ?'; params.push(toDate); }
 
  const tours = db.prepare(query).all(...params);
  res.json(attachReviewStats(attachActiveDeals(tours)));
});

// Task 14: comparison — GET /api/tours/compare?ids=1,2,3
router.get('/compare', (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean).map(Number);
  if (ids.length < 2 || ids.length > 3) {
    return res.status(400).json({ error: 'compare requires 2 or 3 ids' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const tours = db.prepare(`SELECT * FROM tours WHERE id IN (${placeholders})`).all(...ids);
  res.json(attachReviewStats(attachActiveDeals(tours)));
});

router.get('/:id', (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });

  // Task 15: attach discounted_price if an active last-minute deal exists.
  res.json(attachReviewStats(attachActiveDeals(tour)));
});
 
// Update a tour - auth required, and only the owning operator can do it.
// Partial update: only fields present in the body are changed, same pattern
// as PUT /api/reviews/:id.
router.put('/:id', requireAuth, (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });

  const ownsIt = db
    .prepare('SELECT id FROM operators WHERE id = ? AND user_id = ?')
    .get(tour.operator_id, req.user.userId);
  if (!ownsIt) {
    return res.status(403).json({ error: 'you can only edit your own tours' });
  }

  const {
    title, description, location, category,
    price, date, duration_days, min_participants, max_participants, interest_score, features, vehicle_features,
  } = req.body;

  if (title !== undefined && !title) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }
  if (price !== undefined && !(price > 0)) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }
  if (date !== undefined && !date) {
    return res.status(400).json({ error: 'date cannot be empty' });
  }
  if (min_participants !== undefined && !(min_participants >= 1)) {
    return res.status(400).json({ error: 'min_participants must be at least 1' });
  }
  if (max_participants !== undefined && !(max_participants >= 1)) {
    return res.status(400).json({ error: 'max_participants must be at least 1' });
  }
  {
    const effectiveMin = min_participants !== undefined ? Number(min_participants) : tour.min_participants;
    const effectiveMax = max_participants !== undefined ? Number(max_participants) : tour.max_participants;
    if (effectiveMin > effectiveMax) {
      return res.status(400).json({ error: 'min_participants cannot exceed max_participants' });
    }
  }

  const updated = {
    title: title !== undefined ? title : tour.title,
    description: description !== undefined ? description : tour.description,
    location: location !== undefined ? location : tour.location,
    category: category !== undefined ? category : tour.category,
    price: price !== undefined ? price : tour.price,
    date: date !== undefined ? date : tour.date,
    duration_days: duration_days !== undefined ? duration_days : tour.duration_days,
    min_participants: min_participants !== undefined ? min_participants : tour.min_participants,
    max_participants: max_participants !== undefined ? max_participants : tour.max_participants,
    interest_score:
      interest_score !== undefined
        ? JSON.stringify(interest_score)
        : category !== undefined && category !== tour.category
        ? JSON.stringify(buildInterestScore(category))
        : tour.interest_score,
    features: features !== undefined ? features : tour.features,
    vehicle_features: vehicle_features !== undefined ? vehicle_features : tour.vehicle_features,
  };

  db.prepare(
    `UPDATE tours SET title = ?, description = ?, location = ?, category = ?,
       price = ?, date = ?, duration_days = ?, min_participants = ?, max_participants = ?, interest_score = ?,
       features = ?, vehicle_features = ?
     WHERE id = ?`
  ).run(
    updated.title, updated.description, updated.location, updated.category,
    updated.price, updated.date, updated.duration_days, updated.min_participants,
    updated.max_participants, updated.interest_score, updated.features, updated.vehicle_features, tour.id
  );

  res.json(attachActiveDeals(db.prepare('SELECT * FROM tours WHERE id = ?').get(tour.id)));
});

// Delete a tour - auth required, and only the owning operator can do it.
// Ownership is derived from the token, same pattern as PUT /operators/:id.
router.delete('/:id', requireAuth, (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  const ownsIt = db
    .prepare('SELECT id FROM operators WHERE id = ? AND user_id = ?')
    .get(tour.operator_id, req.user.userId);
  if (!ownsIt) {
    return res.status(403).json({ error: 'you can only delete your own tours' });
  }
 
  // Safety gate: don't silently wipe out a tour someone has actually
  // booked. Require an explicit ?force=true to go through anyway.
  const bookingCount = db
    .prepare('SELECT COUNT(*) as count FROM bookings WHERE tour_id = ?')
    .get(tour.id).count;
  if (bookingCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({
      error: `this tour has ${bookingCount} booking(s) - pass ?force=true to delete anyway`,
      booking_count: bookingCount,
    });
  }
 
  // Clean up everything that references this tour so nothing is left
  // pointing at a tour_id that no longer exists.
  const deleteTour = db.transaction(() => {
    db.prepare('DELETE FROM bookings WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM group_formations WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM reviews WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM last_minute_deals WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM tours WHERE id = ?').run(tour.id);
  });
  deleteTour();
 
  res.json({ deleted: true, id: tour.id });
});
 
export default router;