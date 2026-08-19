// Task 1: DB connection + schema bootstrap.
// Run directly (`node src/db/index.js`) to create/verify all tables.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || './turpoint.db';

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // reduces (does not remove) SQLite's single-writer limitation

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Allow `node src/db/index.js` to double as a "create tables now" command.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Schema applied to ${dbPath}`);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  console.log('Tables:', tables.map((t) => t.name).join(', '));
}
