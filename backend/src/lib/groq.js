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
  return !!process.env.GROQ_API_KEY;
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

  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });
  } catch {
    throw new GroqError('unreachable', 'Could not reach the AI provider.');
  }

  if (!response.ok) {
    const status = response.status;
    throw new GroqError(
      status === 401 ? 'unauthorized' : status === 429 ? 'rate_limited' : 'provider_error',
      `Groq API responded with ${status}.`
    );
  }

  const data = await response.json();
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
