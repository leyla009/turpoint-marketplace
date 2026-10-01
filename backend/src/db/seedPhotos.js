// Gives cover images to demo tours that are ALREADY in the database (e.g. the
// ones created by the older seed, which had none). Run once:
//
//     npm run seed:photos
//
// Only touches tours that (a) have no photo yet and (b) have a seed-style title
// ("<location> <category> turu #N"). Tours an operator created, and tours that
// already have a photo (uploaded or seeded), are never changed. Safe to re-run.

import { db } from './index.js';
import { SEED_TOURS } from './seedPhotoData.js';

// 'Gəbələ' is an old spelling of 'Qəbələ' (see db/index.js).
const norm = (loc) => (loc === 'Gəbələ' ? 'Qəbələ' : loc);

const rows = db
  .prepare("SELECT id, title, location, category FROM tours WHERE (photo_url IS NULL OR photo_url = '') AND title LIKE '% turu #%'")
  .all();

const setPhoto = db.prepare('UPDATE tours SET photo_url = ? WHERE id = ?');
let updated = 0;

db.transaction(() => {
  for (const row of rows) {
    const n = parseInt(/#(\d+)\s*$/.exec(row.title)?.[1] ?? '', 10);
    const location = norm(row.location);

    // 1) The tour is the seed tour its title says it is -> use that tour's image.
    let pick = SEED_TOURS.find((s) => s.number === n && s.location === location && s.category === row.category);
    // 2) Otherwise the best match by place + category, then by category alone.
    if (!pick) {
      const pool =
        SEED_TOURS.filter((s) => s.location === location && s.category === row.category).length
          ? SEED_TOURS.filter((s) => s.location === location && s.category === row.category)
          : SEED_TOURS.filter((s) => s.category === row.category);
      if (pool.length) pick = pool[(Number.isInteger(n) ? n : row.id) % pool.length];
    }
    if (pick) {
      setPhoto.run(pick.photo, row.id);
      updated += 1;
    }
  }
})();

console.log(`Cover images added to ${updated} of ${rows.length} photo-less demo tour(s).`);
