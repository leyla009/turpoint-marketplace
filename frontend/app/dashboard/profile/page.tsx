'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Store } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function OperatorProfilePage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile, setMode, refreshOperatorProfile } = useAuth();
  const { t } = useLanguage();

  const isEditing = Boolean(operatorProfile);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [languages, setLanguages] = useState('');
  const [vehicleFeatures, setVehicleFeatures] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (operatorProfile) {
      setName(operatorProfile.name ?? '');
      setDescription(operatorProfile.description ?? '');
      setLanguages(operatorProfile.languages ?? '');
      setVehicleFeatures(operatorProfile.vehicle_features ?? '');
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
    setSubmitting(true);
    try {
      const url = isEditing ? `${API_URL}/api/operators/${operatorProfile!.id}` : `${API_URL}/api/operators`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, languages, vehicle_features: vehicleFeatures }),
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
          <label className="text-xs font-semibold text-foreground block mb-1">{t('profile.languages')}</label>
          <input
            type="text"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="az,en,ru"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t('profile.vehicleFeatures')}</label>
          <input
            type="text"
            value={vehicleFeatures}
            onChange={(e) => setVehicleFeatures(e.target.value)}
            placeholder="wifi,ac,charging,luggage"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
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
