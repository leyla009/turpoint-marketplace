'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudDrizzle, CloudRain, CloudSnow, MapPin, Loader2, type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/translations';
import { DATE_LOCALES } from '../../lib/format';
import { placeName } from '../../lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const UNIT_KEY = 'turpoint_temp_unit';
const FEATURED_CITY_IDS = new Set(['baku', 'sheki', 'guba', 'gabala', 'shamakhi', 'lankaran', 'ganja']);

type Condition = 'clear' | 'clear-night' | 'partly-cloudy' | 'partly-cloudy-night' | 'cloudy' | 'drizzle' | 'rain' | 'snow';

interface Forecast {
  current: {
    temp: number;
    feelsLike: number;
    condition: Condition;
    windKmh: number;
    humidity: number | null;
    precipMm: number;
    high: number | null;
    low: number | null;
    sunset: string | null;
  };
  hourly: { time: string; temp: number; condition: Condition }[];
  daily: { date: string; min: number; max: number; precipMm: number; condition: Condition }[];
}

// A chip. Cities nobody has opened yet arrive without a forecast
// (loaded: false) and are fetched on first click - see lib/stormglass.js.
type CityWeather = { id: string; location: string; loaded: boolean } & Partial<Forecast>;
type LoadedCity = CityWeather & Forecast;
const isLoaded = (c: CityWeather): c is LoadedCity => c.loaded && !!c.current && !!c.hourly && !!c.daily;

interface WeatherResponse {
  configured: boolean;
  cities: CityWeather[];
}

const ICONS: Record<Condition, LucideIcon> = {
  clear: Sun,
  'clear-night': Moon,
  'partly-cloudy': CloudSun,
  'partly-cloudy-night': CloudMoon,
  cloudy: Cloud,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
};

const LABEL_KEY: Record<Condition, TranslationKey> = {
  clear: 'ui.weather.clear',
  'clear-night': 'ui.weather.clearNight',
  'partly-cloudy': 'ui.weather.partlyCloudy',
  'partly-cloudy-night': 'ui.weather.partlyCloudy',
  cloudy: 'ui.weather.cloudy',
  drizzle: 'ui.weather.drizzle',
  rain: 'ui.weather.rain',
  snow: 'ui.weather.snow',
};

// Sunday-first, CLDR's standard Azerbaijani abbreviations.
const AZ_WEEKDAYS_SHORT = ['B.', 'B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.'];

const warm = (c: Condition) => c === 'clear' || c === 'partly-cloudy';

// "Weather in Azerbaijan" - live forecast for destinations across the
// country from GET /api/weather (Stormglass, cached server-side). Renders
// nothing until the backend has a Stormglass key, so no placeholder weather
// is ever shown.
export default function WeatherPanel() {
  const { t, locale } = useLanguage();
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [selected, setSelected] = useState('baku');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [status, setStatus] = useState<Record<string, 'loading' | 'error'>>({});

  useEffect(() => {
    try {
      if (localStorage.getItem(UNIT_KEY) === 'F') setUnit('F');
    } catch {
      /* storage blocked - keep °C */
    }
    fetch(`${API_URL}/api/weather`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const chooseUnit = (u: 'C' | 'F') => {
    setUnit(u);
    try {
      localStorage.setItem(UNIT_KEY, u);
    } catch {
      /* ignore */
    }
  };

  // Opening a city that has no forecast yet fetches it once.
  function selectCity(c: CityWeather) {
    setSelected(c.id);
    if (c.loaded || status[c.id] === 'loading') return;
    setStatus((s) => ({ ...s, [c.id]: 'loading' }));
    fetch(`${API_URL}/api/weather/${c.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((full: CityWeather) => {
        setData((d) => (d ? { ...d, cities: d.cities.map((x) => (x.id === full.id ? full : x)) } : d));
        setStatus(({ [c.id]: _done, ...rest }) => rest);
      })
      .catch(() => setStatus((s) => ({ ...s, [c.id]: 'error' })));
  }

  const visibleCities = useMemo(
    () => data?.cities.filter((c) => FEATURED_CITY_IDS.has(c.id)) ?? [],
    [data]
  );
  const city = useMemo(
    () => visibleCities.find((c) => c.id === selected) ?? visibleCities[0],
    [visibleCities, selected]
  );

  // Nothing to show until at least one city has a real forecast.
  if (!data?.configured || !city || !visibleCities.some(isLoaded)) return null;

  const deg = (c: number | null) => (c == null ? '—' : `${Math.round(unit === 'F' ? (c * 9) / 5 + 32 : c)}°`);
  const bakuTime = (iso: string) =>
    new Intl.DateTimeFormat(DATE_LOCALES[locale], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Baku' }).format(new Date(iso));
  const weekday = (ymd: string) => {
    const d = new Date(`${ymd}T12:00:00Z`);
    // Browsers often lack Azerbaijani weekday data (falling back to English),
    // so az uses fixed abbreviations - same approach as format.ts's months.
    if (locale === 'az') return AZ_WEEKDAYS_SHORT[d.getUTCDay()];
    const name = new Intl.DateTimeFormat(DATE_LOCALES[locale], { weekday: 'short', timeZone: 'UTC' }).format(d);
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <section aria-labelledby="weather-title">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 id="weather-title" className="text-2xl sm:text-[28px] font-bold text-navy">
          {t('ui.weather.title')}
        </h2>
        <div className="flex bg-card border border-border rounded-full p-1 shrink-0" role="group" aria-label={t('ui.weather.unit')}>
          {(['C', 'F'] as const).map((u) => (
            <button
              key={u}
              onClick={() => chooseUnit(u)}
              aria-pressed={unit === u}
              className={`w-10 h-8 rounded-full text-xs font-bold transition-colors ${
                unit === u ? 'bg-navy text-white' : 'text-navy/70 hover:text-navy'
              }`}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>

      {/* City chips */}
      <div className="flex gap-2 overflow-x-auto md:overflow-visible md:flex-wrap scrollbar-hide pb-1 mb-4">
        {visibleCities.map((c) => {
          const Icon = isLoaded(c) ? ICONS[c.current.condition] : MapPin;
          const active = c.id === city.id;
          return (
            <button
              key={c.id}
              onClick={() => selectCity(c)}
              aria-pressed={active}
              className={`shrink-0 flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-colors ${
                active ? 'bg-navy text-white border-navy' : 'bg-card text-foreground border-border hover:border-primary/40'
              }`}
            >
              <Icon size={15} className={active ? 'text-white/80' : 'text-muted-foreground'} />
              <span className="font-medium">{placeName(c.location, locale)}</span>
              {isLoaded(c) && <span className="font-bold">{deg(c.current.temp)}</span>}
              {status[c.id] === 'loading' && <Loader2 size={13} className="animate-spin" />}
            </button>
          );
        })}
      </div>

      {isLoaded(city) ? (
        <ForecastBody city={city} deg={deg} bakuTime={bakuTime} weekday={weekday} />
      ) : (
        <div className="rounded-2xl border border-border bg-surface-sand min-h-[300px] flex flex-col items-center justify-center gap-2 text-center px-6">
          {status[city.id] === 'error' ? (
            <>
              <Cloud size={30} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('ui.weather.unavailable', { city: placeName(city.location, locale) })}</p>
              <button onClick={() => { setStatus(({ [city.id]: _e, ...rest }) => rest); selectCity({ ...city }); }} className="text-sm font-semibold text-primary">
                {t('ui.weather.retry')}
              </button>
            </>
          ) : (
            <>
              <Loader2 size={26} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('ui.weather.loading', { city: placeName(city.location, locale) })}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// The forecast itself for one loaded city: current conditions card and the
// 7-day list.
function ForecastBody({
  city,
  deg,
  bakuTime,
  weekday,
}: {
  city: LoadedCity;
  deg: (c: number | null) => string;
  bakuTime: (iso: string) => string;
  weekday: (ymd: string) => string;
}) {
  const { t, locale } = useLanguage();
  const weekRange = {
    lo: Math.min(...city.daily.map((d) => d.min)),
    hi: Math.max(...city.daily.map((d) => d.max)),
  };
  const CurrentIcon = ICONS[city.current.condition];
  const cityName = placeName(city.location, locale);
  const stats: { labelKey: TranslationKey; value: string }[] = [
    { labelKey: 'ui.weather.wind', value: `${city.current.windKmh} ${t('ui.weather.kmh')}` },
    { labelKey: 'ui.weather.humidity', value: city.current.humidity == null ? '—' : `${city.current.humidity}%` },
    { labelKey: 'ui.weather.precipitation', value: `${city.current.precipMm} ${t('ui.weather.mm')}` },
    { labelKey: 'ui.weather.sunset', value: city.current.sunset ? bakuTime(city.current.sunset) : '—' },
  ];

  return (
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4">
      {/* Current conditions */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1C5A97] via-[#2268AE] to-[#2F7FC4] text-white p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin size={15} /> {cityName}
            </p>
            <p className="text-6xl sm:text-7xl font-light leading-none mt-3">{deg(city.current.temp)}</p>
            <p className="text-lg font-medium mt-3">{t(LABEL_KEY[city.current.condition])}</p>
            <p className="text-sm text-white/80 mt-0.5">
              {t('ui.weather.highLow', { high: deg(city.current.high), low: deg(city.current.low) })} ·{' '}
              {t('ui.weather.feelsLike', { t: deg(city.current.feelsLike) })}
            </p>
          </div>
          <CurrentIcon size={84} strokeWidth={1.4} className="shrink-0 text-white/95" aria-hidden />
        </div>

        <div className="rounded-xl bg-white/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75 mb-3">{t('ui.weather.hourly')}</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-y-4 gap-x-2 text-center">
            {city.hourly.map((h, i) => {
              const Icon = ICONS[h.condition];
              return (
                <div key={h.time} className="flex flex-col items-center gap-1.5">
                  <span className="text-xs text-white/80">{i === 0 ? t('ui.weather.now') : bakuTime(h.time)}</span>
                  <Icon size={20} strokeWidth={1.8} aria-label={t(LABEL_KEY[h.condition])} />
                  <span className="text-sm font-semibold">{deg(h.temp)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.labelKey} className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">{t(s.labelKey)}</p>
              <p className="text-lg font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 7-day forecast */}
      <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t('ui.weather.sevenDay')}</p>
        <ul className="divide-y divide-border flex-1">
          {city.daily.map((d, i) => {
            const Icon = ICONS[d.condition];
            const span = Math.max(1, weekRange.hi - weekRange.lo);
            const left = ((d.min - weekRange.lo) / span) * 100;
            const width = Math.max(6, ((d.max - d.min) / span) * 100);
            return (
              <li key={d.date} className="grid grid-cols-[4.5rem_1.75rem_3.25rem_2.25rem_1fr_2.25rem] items-center gap-2 py-2.5 text-sm">
                <span className="font-semibold text-navy">{i === 0 ? t('ui.weather.today') : weekday(d.date)}</span>
                <Icon size={19} className={warm(d.condition) ? 'text-rating' : 'text-[#5B8DB8]'} aria-label={t(LABEL_KEY[d.condition])} />
                <span className="text-xs font-medium text-[#3B7BBF]">{d.precipMm > 0 ? `${d.precipMm} ${t('ui.weather.mm')}` : ''}</span>
                <span className="text-muted-foreground text-right">{deg(d.min)}</span>
                <span className="relative h-1.5 rounded-full bg-muted" aria-hidden>
                  <span
                    className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#5AA3D6] to-[#F2A33A]"
                    style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                  />
                </span>
                <span className="font-bold text-navy">{deg(d.max)}</span>
              </li>
            );
          })}
        </ul>
        <Link
          href={`/tours?location=${encodeURIComponent(city.location)}`}
          className="mt-4 block text-center bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold py-3 rounded-lg transition-colors"
        >
          {t('ui.weather.seeTours', { city: cityName })}
        </Link>
      </div>
    </div>
  );
}
