'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TOUR_FEATURES } from '../../lib/tourFeatures';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];

function buildInterestScore(category: string) {
  const score: Record<string, number> = {};
  CATEGORIES.forEach((c) => {
    score[c] = c === category ? 0.9 : 0.1;
  });
  return score;
}

export default function NewTourPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('nature');
  const [route, setRoute] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [durationDays, setDurationDays] = useState('1');
  const [minParticipants, setMinParticipants] = useState('3');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [features, setFeatures] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleFeature(slug: string) {
    setFeatures((prev) => (prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title || !price || !date) {
      setError(t('tourForm.requiredError'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/tours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description,
          location,
          category,
          route,
          price: Number(price),
          date,
          duration_days: Number(durationDays),
          min_participants: Number(minParticipants),
          max_participants: Number(maxParticipants),
          interest_score: buildInterestScore(category),
          features: features.join(','),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('tourForm.somethingWrong'));
        return;
      }
      showToast(t('tourForm.publishedToast'));
      router.push('/dashboard');
    } catch {
      setError(t('tourForm.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  if (!operatorProfile) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {t('tourForm.needProfile')}{' '}
        <a href="/dashboard/profile" className="text-primary font-semibold">
          {t('tourForm.createOne')}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-lg mx-auto pb-20 md:pb-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> {t('tourForm.backToDashboard')}
      </button>

      <h1 className="font-display text-xl font-bold text-foreground mb-1">{t('tourForm.addTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t('tourForm.addSubtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-3 bg-card border border-border rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quba nature tour"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.descriptionLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.locationLabel')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Quba"
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.categoryLabel')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}` as TranslationKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.routeLabel')}</label>
          <input
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="Quba mərkəzi -> əsas nöqtə"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.pricePerson')}</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.dateLabel')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.daysLabel')}</label>
            <input
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.minGroup')}</label>
            <input
              type="number"
              min="1"
              value={minParticipants}
              onChange={(e) => setMinParticipants(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.maxGroup')}</label>
            <input
              type="number"
              min="1"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">{t('tourForm.features')}</label>
          <div className="flex flex-wrap gap-2">
            {TOUR_FEATURES.map((feature) => {
              const active = features.includes(feature.slug);
              const Icon = feature.Icon;
              return (
                <button
                  key={feature.slug}
                  type="button"
                  onClick={() => toggleFeature(feature.slug)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/30'
                  }`}
                >
                  <Icon size={12} />
                  {t(feature.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5 disabled:opacity-50"
        >
          {submitting ? t('tourForm.publishing') : t('tourForm.publishTour')}
        </button>
      </form>
    </div>
  );
}
