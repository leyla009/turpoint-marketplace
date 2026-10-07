'use client';

import { useEffect, useState } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning, Droplets, Wind } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { TranslationKey } from '@/app/lib/translations';
import { fetchForecast, forecastWindow, weatherKind, type DayForecast, type WeatherKind } from '@/app/lib/weather';

const ICONS: Record<WeatherKind, typeof Sun> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

const LABEL_KEYS: Record<WeatherKind, TranslationKey> = {
  clear: 'weather.clear',
  partly: 'weather.partly',
  cloudy: 'weather.cloudy',
  fog: 'weather.fog',
  rain: 'weather.rain',
  snow: 'weather.snow',
  storm: 'weather.storm',
};

const DATE_LOCALES = { az: 'az-AZ', en: 'en-GB', ru: 'ru-RU' } as const;
const AZ_WEEKDAYS_SHORT = ['B.', 'B.E.', 'Ç.A.', 'Ç.', 'C.A.', 'C.', 'Ş.'];
const AZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];

interface Props {
  location: string | null;
  date: string;
  durationDays: number;
  /** One-row summary of the first tour day (the page supplies the heading);
   *  multi-day tours can expand to the full day-by-day list. */
  compact?: boolean;
  /** Section heading shown above the compact card - only when there is a card. */
  heading?: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; days: DayForecast[]; truncated: boolean }
  | { kind: 'too_far' }
  | { kind: 'error' };

// Day-by-day forecast for the days the tour actually runs, from Open-Meteo.
// Hidden when the tour is over or has no usable location; shows a friendly
// note when the tour is further out than the 16-day forecast horizon.
export default function WeatherForecast({ location, date, durationDays, compact = false, heading }: Props) {
  const { t, locale } = useLanguage();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!location) {
      setHidden(true);
      return;
    }
    const win = forecastWindow(date, durationDays);
    if (win.status === 'none') {
      setHidden(true);
      return;
    }
    setHidden(false);
    if (win.status === 'too_far') {
      setState({ kind: 'too_far' });
      return;
    }

    const controller = new AbortController();
    setState({ kind: 'loading' });
    fetchForecast(location, win.start, win.end, controller.signal)
      .then((days) => {
        if (controller.signal.aborted) return;
        if (!days || days.length === 0) {
          setHidden(true); // location Open-Meteo doesn't know - no card at all
          return;
        }
        setState({ kind: 'ready', days, truncated: win.truncated });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [location, date, durationDays]);

  if (hidden || !location) return null;

  function dayLabel(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    if (locale === 'az') {
      const weekday = AZ_WEEKDAYS_SHORT[dateObj.getDay()];
      const month = AZ_MONTHS_SHORT[dateObj.getMonth()];
      return `${weekday}, ${d} ${month}`;
    }

    return dateObj.toLocaleDateString(DATE_LOCALES[locale], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  if (compact) {
    const first = state.kind === 'ready' ? state.days[0] : null;
    const kind = first ? weatherKind(first.code) : null;
    const Icon = kind ? ICONS[kind] : CloudSun;
    return (
      <>
      {heading && <h2 className="text-xl font-bold text-navy mb-4">{heading}</h2>}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {state.kind === 'loading' && <div className="h-12 rounded-xl bg-muted animate-pulse" />}
        {state.kind === 'too_far' && <p className="text-sm text-muted-foreground">{t('weather.tooFar')}</p>}
        {state.kind === 'error' && <p className="text-sm text-muted-foreground">{t('weather.unavailable')}</p>}
        {first && kind && (
          <div className="flex items-center gap-4">
            <Icon size={36} className="text-warning shrink-0" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-navy">
                {dayLabel(first.date)} · {Math.round(first.tMax)}° / {Math.round(first.tMin)}°
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(LABEL_KEYS[kind])}
                {first.rainPct !== null && <>, {t('ui.td.rainChance', { pct: Math.round(first.rainPct) })}</>}
              </p>
            </div>
            {state.kind === 'ready' && state.days.length > 1 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                {expanded ? t('ui.td.fewerDays') : `${t('ui.td.allDays', { count: state.days.length })} →`}
              </button>
            )}
          </div>
        )}
        {state.kind === 'ready' && expanded && (
          <div className="flex gap-2 overflow-x-auto pt-4 mt-4 border-t border-border">
            {state.days.map((day) => {
              const k = weatherKind(day.code);
              const DayIcon = ICONS[k];
              return (
                <div key={day.date} className="w-28 shrink-0 rounded-xl border border-border bg-background p-3 text-center">
                  <p className="text-[11px] font-semibold text-foreground mb-1.5">{dayLabel(day.date)}</p>
                  <DayIcon size={24} className="text-primary mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">
                    {Math.round(day.tMax)}°<span className="font-normal text-muted-foreground"> / {Math.round(day.tMin)}°</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-3">
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            {t('weather.credit')}
          </a>
        </p>
      </div>
      </>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-1">
        <CloudSun size={15} className="text-primary" /> {t('weather.title')}
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        {t('weather.hint', { place: location.split(',')[0].trim() })}
      </p>

      {state.kind === 'loading' && (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 w-28 shrink-0 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {state.kind === 'too_far' && <p className="text-xs text-muted-foreground">{t('weather.tooFar')}</p>}
      {state.kind === 'error' && <p className="text-xs text-muted-foreground">{t('weather.unavailable')}</p>}

      {state.kind === 'ready' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {state.days.map((day) => {
              const kind = weatherKind(day.code);
              const Icon = ICONS[kind];
              return (
                <div
                  key={day.date}
                  className="w-28 shrink-0 rounded-xl border border-border bg-background p-3 text-center"
                >
                  <p className="text-[11px] font-semibold text-foreground mb-1.5">{dayLabel(day.date)}</p>
                  <Icon size={26} className="text-primary mx-auto mb-1" />
                  <p className="text-[11px] text-muted-foreground mb-1.5 leading-tight">{t(LABEL_KEYS[kind])}</p>
                  <p className="text-sm font-bold text-foreground">
                    {Math.round(day.tMax)}°
                    <span className="font-normal text-muted-foreground"> / {Math.round(day.tMin)}°</span>
                  </p>
                  <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
                    {day.rainPct !== null && (
                      <p className="flex items-center justify-center gap-1">
                        <Droplets size={10} /> {t('weather.rainChance', { percent: Math.round(day.rainPct) })}
                      </p>
                    )}
                    <p className="flex items-center justify-center gap-1">
                      <Wind size={10} /> {t('weather.wind', { speed: Math.round(day.windKmh) })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {state.truncated && <p className="text-[11px] text-muted-foreground mt-2">{t('weather.partial')}</p>}
        </>
      )}

      <p className="text-[10px] text-muted-foreground mt-2">
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">
          {t('weather.credit')}
        </a>
      </p>
    </div>
  );
}