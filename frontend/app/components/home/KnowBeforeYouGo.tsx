'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, Banknote, FileText, PlaneLanding, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../lib/format';
import { COUNTRY_CODES, countryOptions } from '../../lib/countries';
import { browserCountry, entryRuleFor, ENTRY_RULES_CHECKED, LAND_BORDERS_CLOSED_UNTIL, LINKS } from '../../lib/entryRules';

const STORAGE_KEY = 'turpoint_passport_country';
const FALLBACK_COUNTRY = 'DE';
const isCountry = (c: string | null | undefined): c is string => !!c && c !== 'AZ' && (COUNTRY_CODES as readonly string[]).includes(c);

// External links open in a new tab - every one points at an official source.
function ExtLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 font-semibold text-navy hover:text-primary transition-colors ${className}`}>
      {children}
    </a>
  );
}

function InfoCard({
  Icon,
  iconTone,
  badge,
  badgeTone,
  title,
  text,
  link,
}: {
  Icon: typeof FileText;
  iconTone: string;
  badge: string;
  badgeTone: string;
  title: string;
  text: string;
  link: { href: string; label: string };
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconTone}`}>
          <Icon size={18} />
        </span>
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeTone}`}>{badge}</span>
      </div>
      <h3 className="text-base font-bold text-navy mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed flex-1">{text}</p>
      <ExtLink href={link.href} className="text-sm mt-3 self-start">
        {link.label} <ArrowRight size={14} />
      </ExtLink>
    </div>
  );
}

// "Know before you go": entry rules for the visitor's passport plus the four
// things every traveller to Azerbaijan should know. All rules live in
// lib/entryRules.ts with their sources.
export default function KnowBeforeYouGo() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [country, setCountry] = useState<string>(FALLBACK_COUNTRY);
  // Country names (Intl.DisplayNames) and dates can differ between Node's and
  // the browser's ICU data, so this renders on the client only - it sits far
  // below the fold, and avoids a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Picked country > the account's country of residence > browser region.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    const guess = [stored, user?.country, browserCountry()].find(isCountry);
    if (guess) setCountry(guess);
  }, [user?.country]);

  const choose = (code: string) => {
    setCountry(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* per-visitor convenience only */
    }
  };

  const countries = useMemo(() => countryOptions(locale).filter((c) => c.code !== 'AZ'), [locale]);
  const rule = entryRuleFor(country);
  const date = (iso: string) => formatDate(iso, locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const bordersStillClosed = new Date().toISOString().slice(0, 10) < LAND_BORDERS_CLOSED_UNTIL;
  const free = rule.kind === 'free';

  const rows: [string, string][] = [
    [t('ui.kbyg.rowVisa'), t(free ? 'ui.kbyg.no' : 'ui.kbyg.yes')],
    [t('ui.kbyg.rowEasiest'), t(free ? 'ui.kbyg.optPassport' : rule.kind === 'evisa' ? 'ui.kbyg.optEvisa' : 'ui.kbyg.optEmbassy')],
    [t('ui.kbyg.rowPassport'), t(free ? 'ui.kbyg.passportFree' : 'ui.kbyg.passportVisa')],
    [t('ui.kbyg.rowRegister'), t('ui.kbyg.registerDays', { days: rule.registerAfterDays })],
    [t('ui.kbyg.rowArrive'), t('ui.kbyg.byAir')],
  ];

  const headline = free
    ? {
        title: t('ui.kbyg.noVisa'),
        text: [
          rule.until
            ? t('ui.kbyg.noVisaUntil', { date: date(rule.until), days: rule.days ?? 0 })
            : t('ui.kbyg.noVisaText', { days: rule.days ?? 0 }),
          rule.maxThreeVisits ? t('ui.kbyg.maxVisits') : '',
        ]
          .filter(Boolean)
          .join(' '),
      }
    : { title: t('ui.kbyg.needVisa'), text: t(rule.kind === 'evisa' ? 'ui.kbyg.needVisaEvisa' : 'ui.kbyg.needVisaEmbassy') };

  const badge = free
    ? { text: t('ui.kbyg.badgeFree'), tone: 'bg-success/10 text-success' }
    : rule.kind === 'evisa'
      ? { text: t('ui.kbyg.badgeRequired'), tone: 'bg-primary/10 text-primary' }
      : { text: t('ui.kbyg.badgeEmbassy'), tone: 'bg-warning/15 text-[#B45309]' };

  const optionCard = (title: string, text: string, tag: string, highlighted: boolean, link?: string) => (
    <li className={`rounded-xl border p-3.5 ${highlighted ? 'border-primary/30 bg-primary/[0.04]' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy">
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
              {title}
            </a>
          ) : (
            title
          )}
        </p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${highlighted ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/70'}`}>{tag}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{text}</p>
    </li>
  );

  if (!mounted) return null;

  return (
    <section aria-labelledby="kbyg-title">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
        <div>
          <h2 id="kbyg-title" className="text-2xl sm:text-[28px] font-bold text-navy">
            {t('ui.kbyg.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('ui.kbyg.subtitle')}</p>
        </div>
        <ExtLink href={LINKS.guide} className="text-sm shrink-0">
          {t('ui.kbyg.fullGuide')} <ArrowRight size={14} />
        </ExtLink>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-4 items-start">
        {/* Visa checker */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="bg-navy px-5 py-5">
            <label htmlFor="kbyg-country" className="block text-sm font-semibold text-white mb-2.5">
              {t('ui.kbyg.from')}
            </label>
            <select
              id="kbyg-country"
              value={country}
              onChange={(e) => choose(e.target.value)}
              aria-describedby="kbyg-country-hint"
              className="w-full h-11 px-3 text-sm text-foreground bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p id="kbyg-country-hint" className="text-[11px] text-white/65 mt-1.5">
              {t('ui.kbyg.fromHint')}
            </p>
          </div>

          <div className="p-5">
            <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.tone}`}>{badge.text}</span>

            <div className={`flex items-center gap-4 rounded-xl p-4 mt-3 ${free ? 'bg-success/[0.07]' : 'bg-primary/[0.07]'}`} aria-live="polite">
              {rule.days !== null && (
                <div className={`text-center pr-4 border-r ${free ? 'border-success/20' : 'border-primary/20'}`}>
                  <p className="text-4xl font-bold text-navy leading-none">{rule.days}</p>
                  <p className="text-xs font-medium text-navy/70 mt-1">{t('ui.kbyg.days')}</p>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-bold text-navy">{headline.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{headline.text}</p>
              </div>
            </div>

            <dl className="mt-3 divide-y divide-border">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-navy text-right">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="text-sm font-bold text-navy mt-4 mb-2">{t('ui.kbyg.options')}</p>
            <ul className="space-y-2">
              {free &&
                optionCard(
                  t('ui.kbyg.freeTitle'),
                  t('ui.kbyg.freeText', { days: rule.days ?? 0 }),
                  t('ui.kbyg.badgeFree'),
                  true
                )}
              {rule.evisa &&
                optionCard(t('ui.kbyg.evisaTitle'), t('ui.kbyg.evisaText'), t('ui.kbyg.mostTourists'), rule.kind === 'evisa', LINKS.evisa)}
              {rule.onArrival && optionCard(t('ui.kbyg.arrivalTitle'), t('ui.kbyg.arrivalText'), t('ui.kbyg.atAirport'), false)}
              {optionCard(t('ui.kbyg.embassyTitle'), t('ui.kbyg.embassyText'), t('ui.kbyg.longer'), rule.kind === 'embassy')}
            </ul>

            <p className="text-xs text-muted-foreground mt-4">
              {t('ui.kbyg.karabakhNote')}{' '}
              <a href={LINKS.karabakh} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy hover:text-primary hover:underline">
                yolumuzqarabaga.az
              </a>
            </p>
          </div>
        </div>

        {/* Essentials */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard
              Icon={PlaneLanding}
              iconTone="bg-danger/10 text-danger"
              badge={t('ui.kbyg.important')}
              badgeTone="bg-danger/10 text-danger"
              title={t('ui.kbyg.arriveTitle')}
              text={t(bordersStillClosed ? 'ui.kbyg.arriveText' : 'ui.kbyg.arriveTextPast', { date: date(LAND_BORDERS_CLOSED_UNTIL) })}
              link={{ href: LINKS.borders, label: t('ui.kbyg.arriveLink') }}
            />
            <InfoCard
              Icon={ShieldCheck}
              iconTone="bg-warning/15 text-[#B45309]"
              badge={t('ui.kbyg.permit')}
              badgeTone="bg-warning/15 text-[#B45309]"
              title={t('ui.kbyg.karabakhTitle')}
              text={t('ui.kbyg.karabakhText')}
              link={{ href: LINKS.karabakh, label: 'yolumuzqarabaga.az' }}
            />
            <InfoCard
              Icon={FileText}
              iconTone="bg-primary/10 text-primary"
              badge={t('ui.kbyg.longStays')}
              badgeTone="bg-primary/10 text-primary"
              title={t('ui.kbyg.registerTitle', { days: rule.registerAfterDays })}
              text={t('ui.kbyg.registerText')}
              link={{ href: LINKS.migration, label: t('ui.kbyg.registerLink') }}
            />
            <InfoCard
              Icon={Banknote}
              iconTone="bg-success/10 text-success"
              badge={t('ui.kbyg.essentials')}
              badgeTone="bg-muted text-foreground/70"
              title={t('ui.kbyg.moneyTitle')}
              text={t('ui.kbyg.moneyText')}
              link={{ href: LINKS.rates, label: t('ui.kbyg.moneyLink') }}
            />
          </div>

          <p className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm text-foreground/80">
            <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
            <span>
              {t('ui.kbyg.disclaimer')} {t('ui.kbyg.checked', { date: date(ENTRY_RULES_CHECKED) })}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
