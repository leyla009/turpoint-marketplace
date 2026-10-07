'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TOUR_FEATURES } from '../lib/tourFeatures';
import { VEHICLE_FEATURES } from '../lib/vehicleFeatures';
import { AZERBAIJAN_CITIES } from '../lib/azerbaijanCities';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';
import { photoSrc } from '../lib/photo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CATEGORIES = ['nature', 'history', 'wellness', 'food', 'entertainment'];

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
  // max = the seat count; min = how many must book for the trip to go ahead.
  // They used to be one field sent as BOTH values, which made every tour need
  // to sell out before it confirmed. Defaults mirror the demo seed (min 3, max 10).
  const [seatCount, setSeatCount] = useState(tour ? String(tour.max_participants) : '10');
  const [minSeats, setMinSeats] = useState(tour ? String(tour.min_participants ?? 1) : '3');
  const [features, setFeatures] = useState<string[]>(parseCommaList(tour?.features));
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>(parseCommaList(tour?.vehicle_features));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(
    photoSrc(tour?.photo_url)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extra gallery photos (tour page gallery). Existing ones are removed right
  // away; new ones are queued and uploaded after the tour is saved, because a
  // brand-new tour has no id until then.
  const MAX_EXTRA_PHOTOS = 11;
  const [extraPhotos, setExtraPhotos] = useState<{ id: number; url: string }[]>([]);
  const [queuedPhotos, setQueuedPhotos] = useState<{ file: File; preview: string }[]>([]);
  const extraInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!tour) return;
    fetch(`${API_URL}/api/tours/${tour.id}/photos`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setExtraPhotos(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [tour]);
  const extraSlotsLeft = MAX_EXTRA_PHOTOS - extraPhotos.length - queuedPhotos.length;

  function handleExtraSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, extraSlotsLeft));
    e.target.value = '';
    setQueuedPhotos((prev) => [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  async function removeExistingExtra(photoId: number) {
    if (!tour) return;
    const res = await fetch(`${API_URL}/api/tours/${tour.id}/photos/${photoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (res?.ok) setExtraPhotos(await res.json());
    else showToast(t('tourForm.photoUploadFailed'));
  }

  async function uploadQueuedPhotos(tourId: number) {
    let failed = false;
    for (const { file } of queuedPhotos) {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_URL}/api/tours/${tourId}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).catch(() => null);
      if (!res?.ok) failed = true;
    }
    if (failed) showToast(t('ui.td.photoFailed'));
    setQueuedPhotos([]);
  }

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
    const maxN = Number(seatCount);
    const minN = Number(minSeats);
    if (!Number.isInteger(maxN) || maxN < 1 || !Number.isInteger(minN) || minN < 1) {
      setError(t('tourForm.requiredError'));
      return;
    }
    if (minN > maxN) {
      setError(t('tourForm.minExceedsMaxError'));
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
        min_participants: minN,
        max_participants: maxN,
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
      await uploadQueuedPhotos(data.id);
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
        <a href="/dashboard" className="text-primary font-semibold">
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
          <p className="text-xs font-semibold text-foreground">{t('ui.td.photosTitle')}</p>
          <p className="text-[11px] text-muted-foreground mb-2">{t('ui.td.photosHint', { max: MAX_EXTRA_PHOTOS })}</p>
          <div className="flex flex-wrap gap-2">
            {extraPhotos.map((p) => (
              <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                <img src={photoSrc(p.url) ?? ''} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingExtra(p.id)}
                  aria-label={t('ui.td.removePhoto')}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {queuedPhotos.map((p, i) => (
              <div key={p.preview} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted ring-2 ring-primary/40">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setQueuedPhotos((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={t('ui.td.removePhoto')}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {extraSlotsLeft > 0 && (
              <button
                type="button"
                onClick={() => extraInputRef.current?.click()}
                aria-label={t('ui.td.addPhotos')}
                title={t('ui.td.addPhotos')}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <input
            ref={extraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleExtraSelected}
            className="hidden"
          />
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

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('tourForm.minSeats')}</label>
          <input
            type="number"
            min="1"
            max={seatCount || undefined}
            value={minSeats}
            onChange={(e) => setMinSeats(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{t('tourForm.minSeatsHint')}</p>
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
