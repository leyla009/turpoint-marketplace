'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Map as MapIcon, MessageCircle, Star } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/translations';

const FEATURES: { Icon: typeof MapIcon; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { Icon: MessageCircle, titleKey: 'ui.why.f1Title', bodyKey: 'ui.why.f1Body' },
  { Icon: Star, titleKey: 'ui.why.f2Title', bodyKey: 'ui.why.f2Body' },
  { Icon: MapIcon, titleKey: 'ui.why.f3Title', bodyKey: 'ui.why.f3Body' },
];

const CHIPS: TranslationKey[] = ['ui.why.chip1', 'ui.why.chip2', 'ui.why.chip3', 'ui.why.chip4'];

// Homepage "Why TurPoint" + Smart Planner teaser. The sentence typed here is
// handed to /planner as ?q=, which starts the conversation with it - so the
// plan always comes from the real planner (and real tours), never from here.
export default function WhyAndPlanner() {
  const router = useRouter();
  const { t } = useLanguage();
  const [trip, setTrip] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const plan = () => {
    const q = trip.trim();
    router.push(q ? `/planner?q=${encodeURIComponent(q)}` : '/planner');
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4">
      {/* Why TurPoint */}
      <div className="bg-primary/[0.05] rounded-3xl p-6 sm:p-8 lg:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('ui.why.eyebrow')}</p>
        <h2 className="text-2xl sm:text-[28px] font-bold text-navy mt-2 leading-tight">{t('ui.why.title')}</h2>
        <p className="text-sm sm:text-[15px] text-foreground/70 mt-3 max-w-xl leading-relaxed">{t('ui.why.sub')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
          {FEATURES.map(({ Icon, titleKey, bodyKey }) => (
            <div key={titleKey}>
              <span className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <Icon size={18} className="text-navy" />
              </span>
              <h3 className="text-base font-bold text-navy mt-4">{t(titleKey)}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Planner */}
      <div id="home-planner" className="bg-navy text-white rounded-3xl p-6 sm:p-8 flex flex-col">
        <h2 className="text-2xl font-bold">{t('ui.why.pTitle')}</h2>
        <p className="text-sm text-white/75 mt-2 leading-relaxed">{t('ui.why.pBody')}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            plan();
          }}
          className="mt-5"
        >
          <label htmlFor="home-trip" className="block text-xs font-semibold text-white/90 mb-2">
            {t('ui.why.pLabel')}
          </label>
          <textarea
            ref={inputRef}
            id="home-trip"
            value={trip}
            onChange={(e) => setTrip(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                plan();
              }
            }}
            rows={3}
            maxLength={500}
            placeholder={t('ui.why.pPlaceholder')}
            className="w-full text-sm text-foreground bg-card rounded-xl px-4 py-3 outline-none resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#A8E3EC]"
          />

          <div className="flex flex-wrap gap-2 mt-3">
            {CHIPS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTrip(t(key));
                  inputRef.current?.focus();
                }}
                className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-3 py-1.5 transition-colors"
              >
                {t(key)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="mt-5 w-full flex items-center justify-center gap-2 bg-[#A8E3EC] hover:bg-[#C3EDF3] text-navy text-sm font-bold py-3 rounded-xl transition-colors"
          >
            {t('ui.why.pSubmit')} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}
