'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Store, Camera, AtSign, Phone } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PHONE_PREFIX = '+994';

export default function OperatorProfilePage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile, setMode, refreshOperatorProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const isEditing = Boolean(operatorProfile);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [instagram, setInstagram] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (operatorProfile) {
      setName(operatorProfile.name ?? '');
      setDescription(operatorProfile.description ?? '');
      setPhoneDigits((operatorProfile.phone ?? '').replace(PHONE_PREFIX, ''));
      setInstagram(operatorProfile.instagram ?? '');
    }
  }, [operatorProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!name.trim()) {
      setError(t('profile.nameRequired'));
      return;
    }
    if (!phoneDigits.trim()) {
      setError(t('profile.phoneRequired'));
      return;
    }
    const phone = `${PHONE_PREFIX}${phoneDigits.trim()}`;
    if (!/^\+994\d{7,12}$/.test(phone)) {
      setError(t('profile.phoneInvalid'));
      return;
    }
    setSubmitting(true);
    try {
      const url = isEditing ? `${API_URL}/api/operators/${operatorProfile!.id}` : `${API_URL}/api/operators`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, phone, instagram: instagram.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('profile.somethingWrong'));
        return;
      }
      await refreshOperatorProfile();
      setSuccess(true);
      if (!isEditing) {
        setMode('operator');
        setTimeout(() => router.push('/dashboard'), 800);
      }
    } catch {
      setError(t('profile.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !operatorProfile) return;
    setPhotoError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_URL}/api/operators/me/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setPhotoError(data.error ?? t('profile.somethingWrong'));
        return;
      }
      await refreshOperatorProfile();
      showToast(t('profile.photoUploaded'));
    } catch {
      setPhotoError(t('profile.couldntReachBackend'));
    } finally {
      setUploading(false);
    }
  }

  if (authLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-lg mx-auto">
      <button
        onClick={() => router.push(isEditing ? '/dashboard' : '/')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> {t('profile.back')}
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Store size={20} className="text-primary" />
        <h1 className="font-display text-xl font-bold text-foreground">
          {isEditing ? t('profile.editProfileTitle') : t('profile.becomeOperatorTitle')}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {isEditing ? t('profile.editSubtitle') : t('profile.createSubtitle')}
      </p>

      {isEditing && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 mb-3">
          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {operatorProfile!.photo_url ? (
              <img
                src={`${API_URL}${operatorProfile!.photo_url}`}
                alt={operatorProfile!.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera size={22} className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground mb-1">{t('profile.photo')}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold text-primary disabled:opacity-50"
            >
              {uploading ? t('profile.uploading') : operatorProfile!.photo_url ? t('profile.changePhoto') : t('profile.uploadPhoto')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
              className="hidden"
            />
            {photoError && <p className="text-[11px] text-danger mt-1">{photoError}</p>}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 bg-card border border-border rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('profile.companyName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Qafqaz Tours"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('profile.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('profile.descriptionPlaceholder')}
            rows={3}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('profile.phone')}</label>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg px-3 py-2.5 shrink-0">
              <Phone size={13} /> {PHONE_PREFIX}
            </span>
            <input
              type="tel"
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/[^\d]/g, ''))}
              placeholder={t('profile.phonePlaceholder')}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('profile.instagram')}</label>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg px-3 py-2.5 shrink-0">
              <AtSign size={15} />
            </span>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ''))}
              placeholder={t('profile.instagramPlaceholder')}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        {!isEditing && <p className="text-[11px] text-muted-foreground">{t('profile.photoHint')}</p>}

        {error && <p className="text-xs text-danger">{error}</p>}
        {success && <p className="text-xs text-accent font-semibold">{t('profile.saved')}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5 disabled:opacity-50"
        >
          {submitting ? t('profile.saving') : isEditing ? t('profile.saveChanges') : t('profile.createProfile')}
        </button>
      </form>
    </div>
  );
}
