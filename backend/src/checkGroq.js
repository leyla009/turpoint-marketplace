// `npm run check:groq` - verify the Smart Planner's Groq key from the
// command line without starting the server (exit code 1 if it isn't usable).
import 'dotenv/config';
import { checkGroqKey } from './lib/groq.js';

const { ok, message } = await checkGroqKey();
console[ok ? 'log' : 'error'](message);
process.exitCode = ok ? 0 : 1; // not process.exit(): exiting mid-teardown trips a libuv assertion on Windows
