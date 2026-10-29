// Gives the showcase operator profile a working login. Creates the operator
// account if it is missing (or sets a new password if it exists), links it to
// the "Azerbaijan Discovery (Demo)" profile, and prints the password once.
// The password is generated here and only its bcrypt hash is stored.
//
//   npm run seed:demo-operator

import { randomBytes } from 'node:crypto';
import { db } from './index.js';
import { OPERATOR_EMAIL, OPERATOR_NAME, setShowcaseOperatorLogin } from './showcase.js';

const password = randomBytes(12).toString('base64url');
try {
  const account = setShowcaseOperatorLogin(db, password);
  console.log(`${account.created ? 'Login created' : 'Password reset'} for "${OPERATOR_NAME}".`);
  console.log(`Email:    ${OPERATOR_EMAIL}`);
  console.log(`Password: ${password}`);
  console.log('This password is shown only now. Run this command again for a new one.');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
