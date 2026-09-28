// Helpers for the tour page's weather forecast card. Uses Open-Meteo
// (https://open-meteo.com) - free, no API key, and it allows calls straight
// from the browser, so the backend doesn't need any changes.

import { toLocalISODate } from './date';

// Open-Meteo forecasts today + 15 more days.
export const MAX_FORECAST_DAYS = 16;

// Coordinates for common tour destinations, keyed by normalized city name.
// Anything not listed is looked up through Open-Meteo's geocoding API
// instead (see resolveCity), so a new destination never needs a code change.
const CITY_COORDS: Record<string, [number, number]> = {
  baku: [40.4093, 49.8671],
  bakı: [40.4093, 49.8671],
  sumqayıt: [40.5855, 49.6317],
  gəncə: [40.6828, 46.3606],
  ganja: [40.6828, 46.3606],
  şəki: [41.1919, 47.1706],
  sheki: [41.1919, 47.1706],
  qəbələ: [40.9975, 47.8422],
  gabala: [40.9975, 47.8422],
  quba: [41.3606, 48.5128],
  guba: [41.3606, 48.5128],
  qusar: [41.4271, 48.4302],
  xaçmaz: [41.4591, 48.802],
  lənkəran: [38.7529, 48.8514],
  lankaran: [38.7529, 48.8514],
  astara: [38.456, 48.875],
  lerik: [38.7736, 48.4149],
  masallı: [39.0341, 48.6653],
  şamaxı: [40.6297, 48.6367],
  shamakhi: [40.6297, 48.6367],
  ismayıllı: [40.7844, 48.1522],
  ismayilli: [40.7844, 48.1522],
  lahıc: [40.8339, 48.3781],
  lahij: [40.8339, 48.3781],
  qobustan: [40.1145, 49.4159],
  göygöl: [40.5667, 46.3167],
  goygol: [40.5667, 46.3167],
  zaqatala: [41.6316, 46.6431],
  qax: [41.4186, 46.9261],
  oğuz: [41.0723, 47.4658],
  naxçıvan: [39.2089, 45.4122],
  nakhchivan: [39.2089, 45.4122],
  şuşa: [39.7597, 46.7481],
  mingəçevir: [40.7703, 47.0496],
  şirvan: [39.9379, 48.9206],
  xankəndi: [39.8153, 46.7519],
  qazax: [41.0969, 45.3661],
  tovuz: [40.9926, 45.6286],
  şəmkir: [40.8297, 46.0186],
  balakən: [41.7038, 46.4045],
  naftalan: [40.5044, 46.8272],
  ordubad: [38.904, 46.0243],
  gədəbəy: [40.5701, 45.8127],
  yevlax: [40.6196, 47.15],
  bərdə: [40.3744, 47.1264],
};

// "Baku, Azerbaijan" -> "baku". The replace strips the combining dot that
// toLowerCase() leaves behind for a capital İ ("İsmayıllı" -> "i̇smayıllı").
export function normalizeCity(location: string): string {
  return location.split(',')[0].trim().toLowerCase().replace(/\u0069\u0307/g, 'i');
}

const geocodeCache = new Map<string, [number, number] | null>();

async function resolveCity(location: string, signal?: AbortSignal): Promise<[number, number] | null> {
  const key = normalizeCity(location);
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  const url =
    'https://geocoding-api.open-meteo.com/v1/search?count=1&country_code=AZ&language=en&name=' +
    encodeURIComponent(location.split(',')[0].trim());
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('geocoding failed');
  const data = await res.json();
  const hit = data?.results?.[0];
  const coords: [number, number] | null =
    hit && typeof hit.latitude === 'number' && typeof hit.longitude === 'number'
      ? [hit.latitude, hit.longitude]
      : null;
  geocodeCache.set(key, coords);
  return coords;
}

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

// WMO weather codes (what Open-Meteo returns) grouped into the 7 conditions
// the UI has an icon and a translated label for.
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

export type ForecastWindow =
  | { status: 'none' } // unparseable date, or the tour is already over
  | { status: 'too_far' } // starts more than 15 days from now
  | { status: 'ok'; start: string; end: string; truncated: boolean };

function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

// Which days of the tour can actually be forecast right now: a tour that
// has already started is clipped to start today, and a multi-day tour that
// runs past the 16-day horizon is clipped to the horizon (truncated=true).
export function forecastWindow(tourDate: string, durationDays: number, now: Date = new Date()): ForecastWindow {
  const first = parseLocalDate(tourDate);
  if (!first) return { status: 'none' };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = addDays(first, Math.max(1, durationDays || 1) - 1);
  const horizon = addDays(today, MAX_FORECAST_DAYS - 1);

  if (last < today) return { status: 'none' };
  if (first > horizon) return { status: 'too_far' };

  const start = first < today ? today : first;
  const end = last > horizon ? horizon : last;
  return { status: 'ok', start: toLocalISODate(start), end: toLocalISODate(end), truncated: last > horizon };
}

export interface DayForecast {
  date: string; // YYYY-MM-DD
  code: number;
  tMax: number;
  tMin: number;
  rainPct: number | null;
  windKmh: number;
}

// Returns null when the location can't be resolved to coordinates; throws
// on network/API failure so the caller can show an error state.
export async function fetchForecast(
  location: string,
  start: string,
  end: string,
  signal?: AbortSignal
): Promise<DayForecast[] | null> {
  const coords = await resolveCity(location, signal);
  if (!coords) return null;

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${coords[0]}&longitude=${coords[1]}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
    `&timezone=auto&start_date=${start}&end_date=${end}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('forecast failed');
  const data = await res.json();
  const d = data?.daily;
  if (!d || !Array.isArray(d.time)) throw new Error('bad forecast response');

  return d.time.map((date: string, i: number) => ({
    date,
    code: d.weather_code[i],
    tMax: d.temperature_2m_max[i],
    tMin: d.temperature_2m_min[i],
    rainPct: d.precipitation_probability_max?.[i] ?? null,
    windKmh: d.wind_speed_10m_max[i],
  }));
}
