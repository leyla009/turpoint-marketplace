// Task 1: DB connection + schema bootstrap.
// Run directly (`node src/db/index.js`) to create/verify all tables.
 
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || './turpoint.db';

// In production DB_PATH typically points into a mounted volume (e.g.
// Railway) whose directory may not exist yet on a fresh volume - create it
// up front so better-sqlite3 doesn't fail trying to open the file.
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== '.') {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // reduces (does not remove) SQLite's single-writer limitation
 
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);
 
// Operator/traveler dual-mode account model: operators now link back to
// the user account that owns them via user_id. CREATE TABLE IF NOT EXISTS
// above is a no-op on a database that already has the operators table
// (yours does, from seed.js), so patch the column in defensively here.
// Safe to run on every boot — only touches the DB the first time.
const operatorColumns = db.prepare('PRAGMA table_info(operators)').all().map((c) => c.name);
if (!operatorColumns.includes('user_id')) {
  db.exec('ALTER TABLE operators ADD COLUMN user_id INTEGER REFERENCES users(id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_operators_user_id ON operators(user_id)');
  console.log('Migration applied: operators.user_id added.');
}

// Homepage feature-tag filter (breakfast/evening tea/guide/road games/
// hotel stay): same defensive add-if-missing pattern as user_id above.
const tourColumns = db.prepare('PRAGMA table_info(tours)').all().map((c) => c.name);
if (!tourColumns.includes('features')) {
  db.exec('ALTER TABLE tours ADD COLUMN features TEXT');
  console.log('Migration applied: tours.features added.');
}

// Saved ID card number ("Sənədlərim") so travelers can book without typing
// it in every time: same defensive add-if-missing pattern as above.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('id_number')) {
  db.exec('ALTER TABLE users ADD COLUMN id_number TEXT');
  console.log('Migration applied: users.id_number added.');
}

// Operator contact info (phone/Instagram) replacing the vehicle_features
// profile field - vehicle_features itself stays untouched so the
// homepage's existing "Nəqliyyat filtrləri" filter keeps working off
// whatever operators already set before this change.
const operatorContactColumns = db.prepare('PRAGMA table_info(operators)').all().map((c) => c.name);
if (!operatorContactColumns.includes('phone')) {
  db.exec('ALTER TABLE operators ADD COLUMN phone TEXT');
  db.exec('ALTER TABLE operators ADD COLUMN instagram TEXT');
  console.log('Migration applied: operators.phone and operators.instagram added.');
}

// Vehicle features move from being set once on the operator profile to
// being set per tour (the add-tour form) - a tour matches the homepage's
// vehicle filter using its own value if set, falling back to its
// operator's for tours created before this column existed.
const tourVehicleColumns = db.prepare('PRAGMA table_info(tours)').all().map((c) => c.name);
if (!tourVehicleColumns.includes('vehicle_features')) {
  db.exec('ALTER TABLE tours ADD COLUMN vehicle_features TEXT');
  console.log('Migration applied: tours.vehicle_features added.');
}

// Tour photo upload (see POST /api/tours/:id/photo) - same defensive
// add-if-missing pattern as above.
if (!tourVehicleColumns.includes('photo_url')) {
  db.exec('ALTER TABLE tours ADD COLUMN photo_url TEXT');
  console.log('Migration applied: tours.photo_url added.');
}

// Phone verification (mocked - see routes/operators.js for the fixed dev
// code): tracks a pending code/expiry against the operator, separate from
// the phone column itself, so a number isn't marked verified until its
// code is actually confirmed.
if (!operatorContactColumns.includes('phone_verified')) {
  db.exec('ALTER TABLE operators ADD COLUMN phone_verified INTEGER DEFAULT 0');
  db.exec('ALTER TABLE operators ADD COLUMN phone_verification_code TEXT');
  db.exec('ALTER TABLE operators ADD COLUMN phone_verification_phone TEXT');
  db.exec('ALTER TABLE operators ADD COLUMN phone_verification_expires_at TEXT');
  console.log('Migration applied: operators phone verification columns added.');
}

// Click tracking for "Populyar turlar" (bumped on every GET /api/tours/:id
// - see routes/tours.js) - same defensive add-if-missing pattern as above.
if (!tourVehicleColumns.includes('click_count')) {
  db.exec('ALTER TABLE tours ADD COLUMN click_count INTEGER DEFAULT 0');
  console.log('Migration applied: tours.click_count added.');
}

// Allow `node src/db/index.js` to double as a "create tables now" command.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Schema applied to ${dbPath}`);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  console.log('Tables:', tables.map((t) => t.name).join(', '));
}