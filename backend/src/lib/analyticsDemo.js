// Demo data for the operator analytics dashboard. The app has no bookings
// until real travelers make them, so a fresh dashboard would be all zeros;
// this fills one operator's tours with believable bookings (spread over the
// last few months), page views, favorites and reviews so the charts have
// something to show. Everything it creates is tied to demo-traveler-N@turpoint.demo
// accounts, so `reset` can remove exactly its own data and nothing else.
//
// Takes the db handle as a parameter (rather than importing it) so it can be
// tested against a throwaway in-memory database. Deterministic: the same
// tours always produce the same demo data.

import crypto from 'node:crypto';

const DEMO_TRAVELERS = 6;
const MAX_TOURS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

export const demoEmail = (n) => `demo-traveler-${n}@turpoint.demo`;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// SQLite CURRENT_TIMESTAMP format, UTC: 'YYYY-MM-DD HH:MM:SS'
const sqlTime = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

function ticketCode() {
  return `TP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function seedAnalyticsDemo(db, operatorId, { now = new Date(), passwordHash = 'demo-not-loginable', reset = false } = {}) {
  const today = now.toISOString().slice(0, 10);
  const rng = mulberry32(operatorId * 7919 + 13);

  db.exec('BEGIN');
  try {
    // ---- demo travelers (created once, reused) ----
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    const findUser = db.prepare('SELECT id FROM users WHERE email = ?');
    const demoIds = [];
    for (let n = 1; n <= DEMO_TRAVELERS; n += 1) {
      insertUser.run(`Demo Traveler ${n}`, demoEmail(n), passwordHash);
      demoIds.push(findUser.get(demoEmail(n)).id);
    }
    const inDemo = `(${demoIds.join(',')})`;

    const existing = db
      .prepare(
        `SELECT COUNT(*) AS c FROM bookings b JOIN tours t ON t.id = b.tour_id
         WHERE t.operator_id = ? AND b.user_id IN ${inDemo}`
      )
      .get(operatorId).c;

    if (existing > 0 && !reset) {
      db.exec('ROLLBACK');
      return { skipped: true, reason: 'demo data already present (use --reset to regenerate)' };
    }

    if (reset) {
      const tourIds = `(SELECT id FROM tours WHERE operator_id = ${Number(operatorId)})`;
      db.exec(`DELETE FROM bookings  WHERE user_id IN ${inDemo} AND tour_id IN ${tourIds}`);
      db.exec(`DELETE FROM reviews   WHERE user_id IN ${inDemo} AND tour_id IN ${tourIds}`);
      db.exec(`DELETE FROM favorites WHERE user_id IN ${inDemo} AND tour_id IN ${tourIds}`);
      // Groups left with no bookings at all were demo-made (or already empty).
      db.exec(
        `DELETE FROM group_formations
         WHERE tour_id IN ${tourIds}
           AND id NOT IN (SELECT group_formation_id FROM bookings WHERE group_formation_id IS NOT NULL)`
      );
    }

    const tours = db
      .prepare('SELECT * FROM tours WHERE operator_id = ? ORDER BY id LIMIT ?')
      .all(operatorId, MAX_TOURS);

    const hasGroup = db.prepare('SELECT 1 AS x FROM group_formations WHERE tour_id = ?');
    const insertGroup = db.prepare(
      `INSERT INTO group_formations (tour_id, total_cost, min_participants, current_participants, price_per_person, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertBooking = db.prepare(
      `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const setViews = db.prepare('UPDATE tours SET click_count = ? WHERE id = ?');
    const insertFav = db.prepare('INSERT OR IGNORE INTO favorites (user_id, tour_id) VALUES (?, ?)');
    const hasReview = db.prepare('SELECT 1 AS x FROM reviews WHERE tour_id = ? AND user_id = ?');
    const insertReview = db.prepare('INSERT INTO reviews (tour_id, user_id, rating, comment) VALUES (?, ?, ?, ?)');

    const stats = { tours: 0, bookings: 0, reviews: 0, favorites: 0, skippedTours: 0 };
    const oldest = now.getTime() - 150 * DAY_MS;

    tours.forEach((tour, i) => {
      // A tour that already has a group came from real bookings - never touch it.
      if (hasGroup.get(tour.id)) {
        stats.skippedTours += 1;
        return;
      }
      const isPast = tour.date < today;
      const tourDay = new Date(`${tour.date}T09:00:00Z`).getTime();

      // Leave every 5th tour untouched so the dashboard also shows an empty row.
      const wantBookings = i % 5 === 4 ? 0 : 1 + Math.floor(rng() * 4);
      const rows = [];
      let seatsTotal = 0;
      for (let k = 0; k < wantBookings; k += 1) {
        const seats = 1 + Math.floor(rng() * 3);
        if (seatsTotal + seats > tour.max_participants) break;
        seatsTotal += seats;
        const booker = demoIds[Math.floor(rng() * demoIds.length)];
        // Booked 1-30 days before an old tour ran; 1-25 days ago for upcoming ones.
        let when = isPast ? tourDay - (1 + Math.floor(rng() * 30)) * DAY_MS : now.getTime() - (1 + Math.floor(rng() * 25)) * DAY_MS;
        when = Math.min(Math.max(when, oldest + Math.floor(rng() * 20) * DAY_MS), now.getTime() - DAY_MS / 2);
        rows.push({ booker, seats, when: new Date(when) });
      }

      if (rows.length > 0) {
        const reached = seatsTotal >= tour.min_participants;
        // Mirrors bookings.js + the expire-past-due job: an old tour that never
        // reached its minimum was cancelled; an upcoming one is still forming.
        const bookingStatus = reached ? 'confirmed' : isPast ? 'cancelled' : 'pending';
        const groupStatus = reached ? 'confirmed' : isPast ? 'cancelled' : 'forming';
        const group = insertGroup.run(
          tour.id, tour.price * tour.min_participants, tour.min_participants, seatsTotal, tour.price, groupStatus
        );
        rows.forEach((r) => {
          insertBooking.run(
            tour.id, r.booker, group.lastInsertRowid, r.seats,
            Math.round(tour.price * r.seats * 100) / 100, bookingStatus, ticketCode(), sqlTime(r.when)
          );
          stats.bookings += 1;
        });

        if (isPast && reached) {
          const reviewers = [...new Set(rows.map((r) => r.booker))].slice(0, 2);
          reviewers.forEach((uid) => {
            if (hasReview.get(tour.id, uid)) return;
            insertReview.run(tour.id, uid, 3 + Math.floor(rng() * 3), null);
            stats.reviews += 1;
          });
        }
      }

      setViews.run(Math.max(tour.click_count || 0, seatsTotal * 6 + 10 + Math.floor(rng() * 60)), tour.id);

      const favCount = Math.floor(rng() * 5);
      for (let f = 0; f < favCount; f += 1) {
        stats.favorites += insertFav.run(demoIds[f], tour.id).changes;
      }
      stats.tours += 1;
    });

    // Same rollup as routes/reviews.js so the operator's star rating matches.
    const avg = db
      .prepare(
        `SELECT AVG(r.rating) AS a FROM reviews r JOIN tours t ON t.id = r.tour_id WHERE t.operator_id = ?`
      )
      .get(operatorId).a;
    db.prepare('UPDATE operators SET rating = ? WHERE id = ?').run(avg ? Math.round(avg * 10) / 10 : 0, operatorId);

    db.exec('COMMIT');
    return { skipped: false, ...stats };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
