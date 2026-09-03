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
 
// Allow `node src/db/index.js` to double as a "create tables now" command.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Schema applied to ${dbPath}`);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  console.log('Tables:', tables.map((t) => t.name).join(', '));
}