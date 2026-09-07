'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TOUR_FEATURES } from '../lib/tourFeatures';
import { VEHICLE_FEATURES } from '../lib/vehicleFeatures';
import { AZERBAIJAN_CITIES } from '../lib/azerbaijanCities';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];

export interface ExistingTour {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  price: number;
  date: string;
  duration_days: number;
  min_participants: number;
  max_participants: number;
  features: string | null;
  vehicle_features: string | null;
  photo_url: string | null;
}

function buildInterestScore(category: string) {
  const score: Record<string, number> = {};
  CATEGORIES.forEach((c) => {
    score[c] = c === category ? 0.9 : 0.1;
  });
  return score;
}

function parseCommaList(value: string | null | undefined): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

// ISO 'YYYY-MM-DD' strings parse as UTC midnight the same way regardless
// of the browser's local timezone, so this arithmetic is safe without any
// local-time correction.
function daysBetween(from: string, to: string): number {
  const diffMs = new Date(to).getTime() - new Date(from).getTime();
  return Math.round(diffMs / 86400000);
}
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The tour create/edit form. In create mode (no `tour` prop) it's shared
// between the standalone /dashboard/new-tour page (direct link/bookmark)
// and NewTourModal (opened as a popup from the "+ Tur əlavə et" button
// inside the operator panel page). In edit mode (`tour` passed in) it's
// used by /dashboard/edit-tour/[id] - same fields, pre-filled, submitting
// a PUT instead of a POST. onSuccess fires once the tour is
// published/updated so the caller can navigate away or close the popup.
export default function NewTourContent({ tour, onSuccess }: { tour?: ExistingTour; onSuccess: () => void }) {
  const { token, operatorProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const isEditing = Boolean(tour);

  const [title, setTitle] = useState(tour?.title ?? '');
  const [description, setDescription] = useState(tour?.description ?? '');
  const [location, setLocation] = useState(tour?.location ?? '');
  const [category, setCategory] = useState(tour?.category ?? 'nature');
  const [price, setPrice] = useState(tour ? String(tour.price) : '');
  const [departDate, setDepartDate] = useState(tour?.date ?? '');
  const [returnDate, setReturnDate] = useState(tour ? addDays(tour.date, tour.duration_days) : '');
  const [seatCount, setSeatCount] = useState(tour ? String(tour.max_participants) : '10');
  const [features, setFeatures] = useState<string[]>(parseCommaList(tour?.features));
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>(parseCommaList(tour?.vehicle_features));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(
    tour?.photo_url ? `${API_URL}${tour.photo_url}` : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleFeature(slug: string) {
    setFeatures((prev) => (prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]));
  }

  function toggleVehicleFeature(slug: string) {
    setVehicleFeatures((prev) => (prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]));
  }

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  // Best-effort - the tour itself has already been created/updated
  // successfully by the time this runs, so a failed photo upload
  // shouldn't block the rest of the flow, just surface a toast about it.
  async function uploadPhotoIfNeeded(tourId: number) {
    if (!photoFile) return;
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      const res = await fetch(`${API_URL}/api/tours/${tourId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) showToast(t('tourForm.photoUploadFailed'));
    } catch {
      showToast(t('tourForm.photoUploadFailed'));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title || !price || !departDate || !returnDate) {
      setError(t('tourForm.requiredError'));
      return;
    }
    if (returnDate < departDate) {
      setError(t('tourForm.returnBeforeDepartError'));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        title,
        description,
        location,
        category,
        price: Number(price),
        date: departDate,
        duration_days: Math.max(1, daysBetween(departDate, returnDate)),
        min_participants: Number(seatCount),
        max_participants: Number(seatCount),
        interest_score: buildInterestScore(category),
        features: features.join(','),
        vehicle_features: vehicleFeatures.join(','),
      };
      const url = isEditing ? `${API_URL}/api/tours/${tour!.id}` : `${API_URL}/api/tours`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('tourForm.somethingWrong'));
        return;
      }
      await uploadPhotoIfNeeded(data.id);
      showToast(isEditing ? t('tourForm.updatedToast') : t('tourForm.publishedToast'));
      onSuccess();
    } catch {
      setError(t('tourForm.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
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
    <div>
      <h1 className="font-display text-xl font-bold text-foreground mb-1 pr-10">
        {isEditing ? t('tourForm.editTitle') : t('tourForm.addTitle')}
      </h1>
      <p className="text-sm text-muted-foreground mb-5">
        {isEditing ? t('tourForm.editSubtitle') : t('tourForm.addSubtitle')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera size={22} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">{t('tourForm.photo')}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-primary"
            >
              {photoPreviewUrl ? t('tourForm.changePhoto') : t('tourForm.uploadPhoto')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
              className="hidden"
            />
          </div>
        </div>

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
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            >
              <option value="" disabled>
                {t('tourForm.selectCity')}
              </option>
              {AZERBAIJAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
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
            <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.seatCount')}</label>
            <input
              type="number"
              min="1"
              value={seatCount}
              onChange={(e) => setSeatCount(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('search.depart')}</label>
            <input
              type="date"
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">{t('search.return')}</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
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

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">{t('home.vehicleFilters')}</label>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_FEATURES.map((feature) => {
              const active = vehicleFeatures.includes(feature.slug);
              const Icon = feature.Icon;
              return (
                <button
                  key={feature.slug}
                  type="button"
                  onClick={() => toggleVehicleFeature(feature.slug)}
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

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5 disabled:opacity-50"
        >
          {submitting
            ? isEditing
              ? t('tourForm.saving')
              : t('tourForm.publishing')
            : isEditing
            ? t('tourForm.saveChanges')
            : t('tourForm.publishTour')}
        </button>
      </form>
    </div>
  );
}
