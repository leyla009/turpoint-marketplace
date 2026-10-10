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

// One-off data fix, safe to run on every boot: 'Gəbələ' is an old spelling of
// 'Qəbələ' (the official name), and tours saved with it appeared as a
// separate destination in the location filter. Does nothing once fixed.
const fixedLocations = db.prepare("UPDATE tours SET location = 'Qəbələ' WHERE location = 'Gəbələ'").run();
if (fixedLocations.changes > 0) {
  console.log(`Data fix applied: ${fixedLocations.changes} tour(s) moved from 'Gəbələ' to 'Qəbələ'.`);
}
 
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
const operatorProfileColumns = db.prepare('PRAGMA table_info(operators)').all().map((c) => c.name);
for (const [column, type] of [['voen', 'TEXT'], ['business_card_last4', 'TEXT']]) {
  if (!operatorProfileColumns.includes(column)) {
    db.exec(`ALTER TABLE operators ADD COLUMN ${column} ${type}`);
    console.log(`Migration applied: operators.${column} added.`);
  }
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

// Account settings page: split name, contact details, preferences, avatar,
// and when the password was last changed (null = never changed here).
// `name` stays the canonical display name - it is kept in sync as
// "first last" whenever first/last name are saved.
for (const col of ['first_name', 'last_name', 'phone', 'country', 'preferred_language', 'photo_url', 'password_changed_at']) {
  if (!userColumns.includes(col)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
    console.log(`Migration applied: users.${col} added.`);
  }
}

// Account type is selected at signup. Existing accounts that already own an
// operator profile keep operator access; everyone else defaults to traveler.
if (!userColumns.includes('account_type')) {
  db.exec("ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'traveler' CHECK (account_type IN ('traveler', 'operator'))");
  db.exec(`UPDATE users SET account_type = 'operator'
    WHERE EXISTS (SELECT 1 FROM operators WHERE operators.user_id = users.id)`);
  console.log('Migration applied: users.account_type added.');
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

// Translated tour content (see db/seedTourData.js): title/summary/details in
// az + en + ru, plus language-neutral facts. All nullable - operator-written
// tours keep using the plain title/description columns.
for (const col of ['title_i18n', 'description_i18n', 'details_i18n', 'facts']) {
  if (!tourVehicleColumns.includes(col)) {
    db.exec(`ALTER TABLE tours ADD COLUMN ${col} TEXT`);
    console.log(`Migration applied: tours.${col} added.`);
  }
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

// Payments + refunds: per-booking payment state, refund outcome and who
// cancelled. Same defensive add-if-missing pattern as above. Bookings made
// before this migration get payment_status NULL (treated as legacy/simulated,
// nothing to refund) - see the cancel route.
const bookingColumns = db.prepare('PRAGMA table_info(bookings)').all().map((c) => c.name);
const bookingAdds = [
  ['checked_in_at', 'TEXT'],           // set when an operator validates the ticket QR
  ['payment_status', 'TEXT'],          // authorized | paid | partially_refunded | refunded | voided
  ['paid_amount', 'REAL DEFAULT 0'],   // money actually captured so far
  ['refund_amount', 'REAL DEFAULT 0'],
  ['refund_percent', 'INTEGER'],
  ['payment_ref', 'TEXT'],
  ['card_last4', 'TEXT'],
  ['card_brand', 'TEXT'],
  ['cancelled_at', 'TEXT'],
  ['cancelled_by', 'TEXT'],            // traveler | operator | system
];
let bookingMigrated = false;
for (const [name, type] of bookingAdds) {
  if (!bookingColumns.includes(name)) {
    db.exec(`ALTER TABLE bookings ADD COLUMN ${name} ${type}`);
    bookingMigrated = true;
  }
}
if (bookingMigrated) console.log('Migration applied: bookings payment/refund columns added.');

// Allow `node src/db/index.js` to double as a "create tables now" command.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Schema applied to ${dbPath}`);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  console.log('Tables:', tables.map((t) => t.name).join(', '));
}
