// Thin client for Groq's OpenAI-compatible chat completions API - the free
// AI provider backing the Smart Planner (see routes/planner.js). Plain
// fetch rather than a new SDK dependency: it's one HTTP call shape, and
// this codebase otherwise has zero AI-provider dependencies.
//
// Two models are used on purpose (see routes/planner.js): a small/fast one
// for pulling structured trip requirements out of a free-text message, and
// a larger one for the actual itinerary reasoning over real candidate
// tours. Both are overridable via env in case a model name is retired.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// The original defaults here (llama-3.1-8b-instant / llama-3.3-70b-versatile)
// were retired from Groq's lineup - confirmed via GET /openai/v1/models,
// which no longer lists any Llama chat model at all. Replaced with the
// current smallest/largest general-purpose chat models in the same roles.
export const GROQ_EXTRACT_MODEL = process.env.GROQ_EXTRACT_MODEL || 'openai/gpt-oss-20b';
export const GROQ_ITINERARY_MODEL = process.env.GROQ_ITINERARY_MODEL || 'openai/gpt-oss-120b';

export function groqConfigured() {
  return !!process.env.GROQ_API_KEY?.trim();
}

// Startup self-check for the Smart Planner: confirms the key is present AND
// accepted by Groq (GET /models is free and doesn't use completion quota),
// and that both configured models actually exist on the account. Never
// throws - it only reports, so a missing/bad key can't stop the API booting.
// Returns { ok, reason, message } for the caller to log.
export async function checkGroqKey() {
  if (!groqConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'GROQ_API_KEY is not set - Smart Planner is disabled. Get a free key at https://console.groq.com/keys and add it to backend/.env',
    };
  }
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, reason: 'unreachable', message: 'Could not reach Groq to verify GROQ_API_KEY (offline?). The planner will retry on each request.' };
  }
  if (response.status === 401) {
    return { ok: false, reason: 'unauthorized', message: 'Groq rejected GROQ_API_KEY (401). Check the key in backend/.env - it should start with "gsk_".' };
  }
  if (!response.ok) {
    return { ok: false, reason: 'provider_error', message: `Groq responded with ${response.status} while verifying GROQ_API_KEY.` };
  }
  const data = await response.json().catch(() => null);
  const available = new Set((data?.data ?? []).map((m) => m.id));
  const missing = [GROQ_EXTRACT_MODEL, GROQ_ITINERARY_MODEL].filter((m) => !available.has(m));
  if (available.size && missing.length) {
    return {
      ok: false,
      reason: 'model_missing',
      message: `GROQ_API_KEY works, but these models aren't available to it: ${missing.join(', ')}. Set GROQ_EXTRACT_MODEL / GROQ_ITINERARY_MODEL in backend/.env.`,
    };
  }
  return { ok: true, reason: 'ok', message: `Smart Planner ready (Groq: ${GROQ_EXTRACT_MODEL} + ${GROQ_ITINERARY_MODEL}).` };
}

// Calls Groq's chat completions endpoint and returns the parsed JSON body
// of the assistant's reply (response_format: json_object is requested, so
// the model is strongly biased toward emitting only valid JSON). Throws a
// GroqError with a `reason` the route handlers can map to a friendly,
// specific message - "not configured", "unreachable", vs. "bad response".
export async function groqJson({ model, system, messages, temperature = 0.4 }) {
  if (!groqConfigured()) {
    throw new GroqError('not_configured', 'Groq API key is not configured on the server.');
  }

  // Free-tier Groq fails transiently more often than you'd expect: 5xx
  // blips, short 429 bursts, and - with JSON mode on the gpt-oss models -
  // 400 "json_validate_failed" when a generation isn't valid JSON. One
  // failure used to surface straight to the traveler as "temporary
  // problem", so retry those with a short backoff before giving up.
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) await sleep(lastError?.retryAfterMs ?? 600 * 2 ** (attempt - 1));
    try {
      return await groqJsonOnce({ model, system, messages, temperature });
    } catch (err) {
      lastError = err;
      const retryable = err instanceof GroqError && RETRYABLE.has(err.reason);
      console.warn(`[planner] Groq ${model} attempt ${attempt + 1} failed: ${err.message}${retryable && attempt < MAX_RETRIES ? ' - retrying' : ''}`);
      if (!retryable) break;
    }
  }
  throw lastError;
}

const MAX_RETRIES = 2;
const RETRYABLE = new Set(['unreachable', 'rate_limited', 'provider_error', 'empty_response', 'malformed_json']);
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 8000)));

async function groqJsonOnce({ model, system, messages, temperature }) {
  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, ...messages],
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new GroqError('unreachable', 'Could not reach the AI provider.');
  }

  if (!response.ok) {
    const status = response.status;
    const body = await response.json().catch(() => null);
    const detail = body?.error?.message ? ` ${String(body.error.message).slice(0, 200)}` : '';

    // JSON mode rejected the generation - Groq still returns what the model
    // wrote in `failed_generation`, which is usually valid JSON wrapped in a
    // code fence or followed by stray text. Salvage it before retrying.
    if (status === 400 && body?.error?.code === 'json_validate_failed') {
      const salvaged = parseJsonLoose(String(body.error.failed_generation ?? ''));
      if (salvaged !== null) return salvaged;
      throw new GroqError('malformed_json', `Groq JSON validation failed.${detail}`);
    }

    const err = new GroqError(
      status === 401 ? 'unauthorized' : status === 429 ? 'rate_limited' : 'provider_error',
      `Groq API responded with ${status}.${detail}`
    );
    const retryAfter = Number(response.headers.get('retry-after'));
    if (status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) err.retryAfterMs = retryAfter * 1000;
    // Other 4xx (bad request, model gone) won't fix themselves on retry.
    if (status >= 400 && status < 500 && status !== 429) err.reason = status === 401 ? 'unauthorized' : 'bad_request';
    throw err;
  }

  const data = await response.json().catch(() => null);
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new GroqError('empty_response', 'The AI returned an empty response.');

  const parsed = parseJsonLoose(raw);
  if (parsed === null) throw new GroqError('malformed_json', 'The AI returned a response that was not valid JSON.');
  return parsed;
}

// Groq's JSON mode is reliable but not infallible - this tolerates the
// occasional markdown code fence or leading/trailing prose the model adds
// despite being asked for raw JSON, by extracting the outermost {...}
// block before giving up.
function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export class GroqError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}
