'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Leaf, Landmark, Music, Utensils, Wallet, Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Interest = 'nature' | 'history' | 'entertainment' | 'food';

const INTERESTS: { id: Interest; labelKey: TranslationKey; Icon: any }[] = [
  { id: 'nature', labelKey: 'category.nature', Icon: Leaf },
  { id: 'history', labelKey: 'category.history', Icon: Landmark },
  { id: 'entertainment', labelKey: 'category.entertainment', Icon: Music },
  { id: 'food', labelKey: 'category.food', Icon: Utensils },
];

interface PlannerTour {
  id: number;
  title: string;
  price: number;
  duration_days: number;
  match_score: number;
  reason: string;
}

interface PlannerResult {
  selected_tours: PlannerTour[];
  total_price: number;
  total_days: number;
  remaining_budget: number;
}

// Floating Smart Planner, opened from the homepage's corner button instead
// of navigating to a separate page - same rationale and same portal fix
// (escaping the sidebar's `sticky` stacking context) as CompareModal.
export default function PlannerModal({
  onClose,
  onViewTour,
}: {
  onClose: () => void;
  onViewTour: (id: number) => void;
}) {
  const { t } = useLanguage();

  const [budget, setBudget] = useState('');
  const [days, setDays] = useState('');
  const [interests, setInterests] = useState<Interest[]>([]);

  const [fieldErrors, setFieldErrors] = useState<{ budget?: string; days?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<PlannerResult | null>(null);

  function toggleInterest(id: Interest) {
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validate() {
    const errs: { budget?: string; days?: string } = {};
    const budgetNum = Number(budget);
    const daysNum = Number(days);
    if (!budget || Number.isNaN(budgetNum) || budgetNum <= 0) {
      errs.budget = t('planner.budgetError');
    }
    if (!days || Number.isNaN(daysNum) || daysNum <= 0 || !Number.isInteger(daysNum)) {
      errs.days = t('planner.daysError');
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: Number(budget), days: Number(days), interests }),
      });
      if (!res.ok) throw new Error('planner request failed');
      const data = await res.json();
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          title={t('map.close')}
          aria-label={t('map.close')}
          className="absolute top-3 right-3 z-10 bg-muted hover:bg-border text-foreground rounded-full p-2 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1 pr-10">
          <Calendar size={18} className="text-accent" />
          <h2
            className="text-lg sm:text-xl font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('planner.title')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{t('planner.subtitle')}</p>

        <form onSubmit={handleSubmit} className="bg-background border border-border rounded-xl p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                <Wallet size={13} /> {t('planner.budgetLabel')}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={t('planner.budgetPlaceholder')}
                className={`w-full text-sm bg-card border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none ${
                  fieldErrors.budget ? 'border-red-400' : 'border-border'
                }`}
              />
              {fieldErrors.budget && <p className="text-xs text-red-500 mt-1">{fieldErrors.budget}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                <Calendar size={13} /> {t('planner.daysLabel')}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder={t('planner.daysPlaceholder')}
                className={`w-full text-sm bg-card border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none ${
                  fieldErrors.days ? 'border-red-400' : 'border-border'
                }`}
              />
              {fieldErrors.days && <p className="text-xs text-red-500 mt-1">{fieldErrors.days}</p>}
            </div>
          </div>

          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            {t('planner.interests')} <span className="text-muted-foreground font-normal">{t('planner.optional')}</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-5">
            {INTERESTS.map((interest) => {
              const Icon = interest.Icon;
              const active = interests.includes(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-foreground border-border hover:border-primary/30'
                  }`}
                >
                  <Icon size={12} />
                  {t(interest.labelKey)}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground font-bold text-sm rounded-lg py-3 hover:opacity-90 disabled:opacity-60"
          >
            <Sparkles size={15} />
            {loading ? t('planner.buildingTrip') : t('planner.buildTrip')}
          </button>
        </form>

        {error && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">{t('planner.couldntReachPlanner')}</p>
          </div>
        )}

        {result && !error && (
          <div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-4 text-sm">
              <span className="text-foreground">
                <span className="font-bold">{result.total_price} AZN</span>{' '}
                <span className="text-muted-foreground">{t('planner.spent')}</span>
              </span>
              <span className="text-foreground">
                <span className="font-bold">{result.total_days}</span>{' '}
                <span className="text-muted-foreground">{t('planner.daysUsed')}</span>
              </span>
              <span className="text-foreground">
                <span className="font-bold">{result.remaining_budget} AZN</span>{' '}
                <span className="text-muted-foreground">{t('planner.leftOver')}</span>
              </span>
            </div>

            {result.selected_tours.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground bg-background border border-border rounded-xl">
                <Sparkles size={26} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('planner.noToursFit')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.selected_tours.map((tour, i) => (
                  <button
                    key={tour.id}
                    onClick={() => onViewTour(tour.id)}
                    className="w-full text-left flex items-center justify-between gap-3 bg-background border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-foreground truncate">{tour.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('planner.dayCount', { count: tour.duration_days })} · {tour.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-foreground">{tour.price} AZN</span>
                      <ArrowRight size={14} className="text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
