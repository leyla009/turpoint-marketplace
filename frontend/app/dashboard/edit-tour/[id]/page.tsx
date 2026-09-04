'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { TOUR_FEATURES, parseFeatures } from '../../../lib/tourFeatures';
import { useLanguage } from '../../../context/LanguageContext';
import type { TranslationKey } from '../../../lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];

export default function EditTourPage() {
  const router = useRouter();
  const { id } = useParams();
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [loadingTour, setLoadingTour] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notOwner, setNotOwner] = useState(false);

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

  useEffect(() => {
    if (!id || !operatorProfile) return;
    setLoadingTour(true);
    fetch(`${API_URL}/api/tours/${id}`)
      .then((r) => r.json())
      .then((tour) => {
        if (!tour?.id) {
          setLoadError(t('tourForm.tourNotFound'));
          return;
        }
        if (tour.operator_id !== operatorProfile.id) {
          setNotOwner(true);
          return;
        }
        setTitle(tour.title ?? '');
        setDescription(tour.description ?? '');
        setLocation(tour.location ?? '');
        setCategory(tour.category ?? 'nature');
        setRoute(tour.route ?? '');
        setPrice(String(tour.price ?? ''));
        setDate(tour.date ?? '');
        setDurationDays(String(tour.duration_days ?? 1));
        setMinParticipants(String(tour.min_participants ?? 3));
        setMaxParticipants(String(tour.max_participants ?? 10));
        setFeatures(parseFeatures(tour.features));
      })
      .catch(() => setLoadError(t('tourForm.couldntReachBackend')))
      .finally(() => setLoadingTour(false));
  }, [id, operatorProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title || !price || !date) {
      setError(t('tourForm.requiredError'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/tours/${id}`, {
        method: 'PUT',
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
          features: features.join(','),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('tourForm.somethingWrong'));
        return;
      }
      showToast(t('tourForm.updatedToast'));
      router.push('/dashboard');
    } catch {
      setError(t('tourForm.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loadingTour) {
    return (
      <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> {t('dashboard.loading')}
      </div>
    );
  }

  if (loadError) {
    return <div className="p-6 text-sm text-muted-foreground">{loadError}</div>;
  }

  if (notOwner) {
    return <div className="p-6 text-sm text-muted-foreground">{t('tourForm.notYourTour')}</div>;
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-lg mx-auto pb-20 md:pb-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> {t('tourForm.backToDashboard')}
      </button>

      <h1 className="font-display text-xl font-bold text-foreground mb-1">{t('tourForm.editTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t('tourForm.editSubtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-3 bg-card border border-border rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          {submitting ? t('tourForm.saving') : t('tourForm.saveChanges')}
        </button>
      </form>
    </div>
  );
}
