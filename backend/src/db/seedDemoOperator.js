// Gives the showcase operator profile a working login. Creates the operator
// account if it is missing (or sets a new password if it exists), links it to
// the "Azerbaijan Discovery (Demo)" profile, and prints the password once.
// The password is generated here and only its bcrypt hash is stored.
//
//   npm run seed:demo-operator

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './index.js';

const OPERATOR_NAME = 'Azerbaijan Discovery (Demo)';
const EMAIL = 'operator.demo@turpoint.test';

const operator = db.prepare('SELECT id, user_id FROM operators WHERE name = ?').get(OPERATOR_NAME);
if (!operator) {
  console.error(`No "${OPERATOR_NAME}" operator profile found. Seed the tours first ("npm run seed:showcase" on an empty database).`);
  process.exit(1);
}

const password = randomBytes(12).toString('base64url');
const hash = bcrypt.hashSync(password, 10);

const result = db.transaction(() => {
  let user = db.prepare('SELECT id, account_type FROM users WHERE lower(email) = ?').get(EMAIL);
  if (operator.user_id && operator.user_id !== user?.id) {
    const owner = db.prepare('SELECT email FROM users WHERE id = ?').get(operator.user_id);
    throw new Error(`"${OPERATOR_NAME}" already belongs to ${owner?.email ?? `user ${operator.user_id}`}; nothing was changed.`);
  }
  if (user) {
    if (db.prepare('SELECT 1 FROM operators WHERE user_id = ? AND id != ?').get(user.id, operator.id)) {
      throw new Error(`${EMAIL} already owns a different operator profile; nothing was changed.`);
    }
    db.prepare("UPDATE users SET password_hash = ?, account_type = 'operator', password_changed_at = datetime('now') WHERE id = ?")
      .run(hash, user.id);
  } else {
    user = { id: db.prepare("INSERT INTO users (name, email, password_hash, account_type) VALUES ('Azerbaijan Discovery', ?, ?, 'operator')")
      .run(EMAIL, hash).lastInsertRowid };
  }
  db.prepare('UPDATE operators SET user_id = ? WHERE id = ?').run(user.id, operator.id);
  return operator.user_id ? 'Password reset' : 'Login created';
})();

console.log(`${result} for "${OPERATOR_NAME}".`);
console.log(`Email:    ${EMAIL}`);
console.log(`Password: ${password}`);
console.log('This password is shown only now. Run this command again for a new one.');
