// Homepage "Weather in Azerbaijan" panel, backed by Stormglass
// (https://docs.stormglass.io). The API key stays on the server - the
// browser only ever talks to GET /api/weather.
//
// Quota: Stormglass's free plan allows 10 requests/day and every city is a
// separate request, so each city's forecast is cached in SQLite (survives
// restarts) for STORMGLASS_CACHE_HOURS (default 6). One fetch returns ~8
// days of hourly data, so a cached forecast stays useful - "now", the next
// hours and the 7 days are always recomputed from it at request time. If
// Stormglass refuses a call (quota, outage) the last good forecast is
// served instead of an error.

import { db } from '../db/index.js';

const API_URL = 'https://api.stormglass.io/v2/weather/point';
const PARAMS = ['airTemperature', 'cloudCover', 'precipitation', 'humidity', 'windSpeed'];
const BAKU_OFFSET_HOURS = 4; // Asia/Baku is UTC+4 all year (no DST)
const FORECAST_DAYS = 7;

// The six destinations shown as chips. `location` is the stored tour
// location, used for the "See tours in ..." link.
export const WEATHER_CITIES = [
  { id: 'baku', location: 'Bakı', lat: 40.4093, lng: 49.8671 },
  { id: 'sheki', location: 'Şəki', lat: 41.1919, lng: 47.1706 },
  { id: 'guba', location: 'Quba', lat: 41.3606, lng: 48.5128 },
  { id: 'gabala', location: 'Qəbələ', lat: 40.9975, lng: 47.8422 },
  { id: 'shamakhi', location: 'Şamaxı', lat: 40.6297, lng: 48.6367 },
  { id: 'lankaran', location: 'Lənkəran', lat: 38.7529, lng: 48.8514 },
];

export function stormglassConfigured() {
  return !!process.env.STORMGLASS_API_KEY?.trim();
}

const cacheMs = () => Math.max(1, Number(process.env.STORMGLASS_CACHE_HOURS) || 6) * 3600 * 1000;

db.exec(`CREATE TABLE IF NOT EXISTS weather_cache (
  city TEXT PRIMARY KEY,
  hours_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
)`);
const readCache = db.prepare('SELECT hours_json, fetched_at FROM weather_cache WHERE city = ?');
const writeCache = db.prepare(
  `INSERT INTO weather_cache (city, hours_json, fetched_at) VALUES (?, ?, ?)
   ON CONFLICT(city) DO UPDATE SET hours_json = excluded.hours_json, fetched_at = excluded.fetched_at`
);

// Start of "today" in Baku, as a UTC timestamp - so today's high/low cover
// the whole local day, not just the hours left after the fetch.
function bakuMidnightUtc(now = Date.now()) {
  const local = new Date(now + BAKU_OFFSET_HOURS * 3600e3);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - BAKU_OFFSET_HOURS * 3600e3;
}

// Stormglass returns every value per data source ({ sg: 12.3, noaa: ... });
// we ask for source=sg (their blended model) but fall back to any source.
const pick = (v) => (v == null ? null : typeof v === 'number' ? v : v.sg ?? Object.values(v).find((x) => typeof x === 'number') ?? null);

async function fetchCity(city) {
  const start = bakuMidnightUtc();
  const end = start + (FORECAST_DAYS + 1) * 864e5;
  const url = `${API_URL}?lat=${city.lat}&lng=${city.lng}&params=${PARAMS.join(',')}&source=sg&start=${start / 1000}&end=${end / 1000}`;
  const res = await fetch(url, {
    headers: { Authorization: process.env.STORMGLASS_API_KEY.trim() },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.errors ? JSON.stringify(body.errors).slice(0, 200) : '';
    const err = new Error(`Stormglass responded ${res.status} for ${city.id}. ${detail}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data.hours ?? []).map((h) => ({
    t: Date.parse(h.time),
    temp: pick(h.airTemperature),
    cloud: pick(h.cloudCover),
    precip: pick(h.precipitation),
    humidity: pick(h.humidity),
    wind: pick(h.windSpeed), // m/s
  })).filter((h) => Number.isFinite(h.t) && h.temp != null);
}

// Cached hours for a city: fresh cache -> as is; stale or missing -> try
// Stormglass, falling back to whatever is cached if that fails.
// Concurrent page views share one in-flight request per city, and after a
// failure (e.g. daily quota used up) the city isn't retried for a while, so
// a burst of visitors can never burn through the quota.
const inFlight = new Map();
const failedAt = new Map();
const RETRY_AFTER_FAILURE_MS = 30 * 60 * 1000;

async function hoursFor(city) {
  const cached = readCache.get(city.id);
  const fromCache = (stale) => ({ hours: JSON.parse(cached.hours_json), fetchedAt: cached.fetched_at, stale });
  if (cached && Date.now() - cached.fetched_at < cacheMs()) return fromCache(false);

  const lastFail = failedAt.get(city.id);
  if (lastFail && Date.now() - lastFail < RETRY_AFTER_FAILURE_MS) {
    if (cached) return fromCache(true);
    throw new Error(`Stormglass failed recently for ${city.id}; not retrying yet.`);
  }

  if (!inFlight.has(city.id)) {
    inFlight.set(
      city.id,
      fetchCity(city)
        .then((hours) => {
          if (!hours.length) throw new Error(`Stormglass returned no hours for ${city.id}.`);
          const fetchedAt = Date.now();
          writeCache.run(city.id, JSON.stringify(hours), fetchedAt);
          failedAt.delete(city.id);
          return { hours, fetchedAt, stale: false };
        })
        .finally(() => inFlight.delete(city.id))
    );
  }
  try {
    return await inFlight.get(city.id);
  } catch (err) {
    failedAt.set(city.id, Date.now());
    console.warn(`[weather] ${err.message}${cached ? ' - serving cached forecast' : ''}`);
    if (cached) return fromCache(true);
    throw err;
  }
}

// --- derived values -------------------------------------------------------

// Condition from cloud cover (%) and precipitation (mm/h); the frontend
// translates the code and picks the icon.
function condition({ cloud = 0, precip = 0, temp = 10 }, isDay = true) {
  if (precip >= 0.5) return temp <= 0 ? 'snow' : 'rain';
  if (precip >= 0.1) return temp <= 0 ? 'snow' : 'drizzle';
  if (cloud < 20) return isDay ? 'clear' : 'clear-night';
  if (cloud < 65) return isDay ? 'partly-cloudy' : 'partly-cloudy-night';
  return 'cloudy';
}

// Australian Bureau of Meteorology apparent temperature (shade), from air
// temperature (°C), relative humidity (%) and wind speed (m/s).
function feelsLike(temp, humidity, wind) {
  if (humidity == null || wind == null) return temp;
  const e = (humidity / 100) * 6.105 * Math.exp((17.27 * temp) / (237.7 + temp));
  return temp + 0.33 * e - 0.7 * wind - 4.0;
}

// Sunrise/sunset (UTC ms) with the NOAA solar-position approximation -
// accurate to about a minute, and it saves a second Stormglass request.
function sunTimes(lat, lng, dayStartUtc) {
  const rad = Math.PI / 180;
  // Whole days since J2000 at local noon - the formula needs an integer day.
  const jdNoon = (dayStartUtc + 12 * 3600e3) / 864e5 + 2440587.5;
  const n = Math.round(jdNoon - 2451545.0 + 0.0008);
  const jStar = n - lng / 360;
  const m = (357.5291 + 0.98560028 * jStar) % 360;
  const c = 1.9148 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 0.0003 * Math.sin(3 * m * rad);
  const lambda = (m + c + 180 + 102.9372) % 360;
  const jTransit = 2451545.0 + jStar + 0.0053 * Math.sin(m * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const decl = Math.asin(Math.sin(lambda * rad) * Math.sin(23.44 * rad));
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null;
  const h = Math.acos(cosH) / rad;
  const toMs = (j) => (j - 2440587.5) * 864e5;
  return { sunrise: toMs(jTransit - h / 360), sunset: toMs(jTransit + h / 360) };
}

const round = (n, d = 0) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

// Everything the panel shows for one city, computed for "now".
function buildCityView(city, hours, now = Date.now()) {
  const dayStart = bakuMidnightUtc(now);
  const sun = sunTimes(city.lat, city.lng, dayStart);
  const isDayAt = (t) => {
    const s = sunTimes(city.lat, city.lng, bakuMidnightUtc(t));
    return s ? t >= s.sunrise && t < s.sunset : true;
  };

  const currentIdx = Math.max(0, hours.findIndex((h) => h.t + 3600e3 > now));
  const cur = hours[currentIdx];

  const days = [];
  for (let d = 0; d < FORECAST_DAYS; d += 1) {
    const from = dayStart + d * 864e5;
    const dayHours = hours.filter((h) => h.t >= from && h.t < from + 864e5);
    if (!dayHours.length) continue;
    const temps = dayHours.map((h) => h.temp);
    const daytime = dayHours.filter((h) => isDayAt(h.t));
    const basis = daytime.length ? daytime : dayHours;
    const precipTotal = dayHours.reduce((s, h) => s + (h.precip ?? 0), 0);
    const avgCloud = basis.reduce((s, h) => s + (h.cloud ?? 0), 0) / basis.length;
    days.push({
      date: new Date(from + BAKU_OFFSET_HOURS * 3600e3).toISOString().slice(0, 10),
      min: round(Math.min(...temps), 1),
      max: round(Math.max(...temps), 1),
      precipMm: round(precipTotal, 1),
      condition: condition({ cloud: avgCloud, precip: precipTotal / 8, temp: Math.max(...temps) }, true),
    });
  }

  const hourly = [];
  for (let i = currentIdx; i < hours.length && hourly.length < 8; i += 3) {
    const h = hours[i];
    hourly.push({ time: new Date(h.t).toISOString(), temp: round(h.temp, 1), condition: condition(h, isDayAt(h.t)) });
  }

  return {
    id: city.id,
    location: city.location,
    current: {
      temp: round(cur.temp, 1),
      feelsLike: round(feelsLike(cur.temp, cur.humidity, cur.wind), 1),
      condition: condition(cur, isDayAt(now)),
      windKmh: round((cur.wind ?? 0) * 3.6),
      humidity: round(cur.humidity),
      precipMm: round(cur.precip ?? 0, 1),
      high: days[0]?.max ?? null,
      low: days[0]?.min ?? null,
      sunset: sun ? new Date(sun.sunset).toISOString() : null,
    },
    hourly,
    daily: days,
  };
}

// Exported for tests.
export const _internals = { sunTimes, feelsLike, condition, buildCityView, bakuMidnightUtc };

/** All panel cities. Cities that can't be loaded at all are left out. */
export async function weatherOverview() {
  const results = await Promise.allSettled(WEATHER_CITIES.map((c) => hoursFor(c).then((r) => ({ city: c, ...r }))));
  const cities = [];
  let oldestFetch = null;
  let stale = false;
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    cities.push(buildCityView(r.value.city, r.value.hours));
    oldestFetch = oldestFetch == null ? r.value.fetchedAt : Math.min(oldestFetch, r.value.fetchedAt);
    stale ||= r.value.stale;
  }
  return { cities, updatedAt: oldestFetch ? new Date(oldestFetch).toISOString() : null, stale };
}
