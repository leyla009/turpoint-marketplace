'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Store, Camera, AtSign, Phone, CheckCircle2 } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PHONE_PREFIX = '+994';

const PHONE_DIGIT_COUNT = 9;

// Live-formats the digits after +994 as 2-3-2-2 (e.g. "50 123 45 67"),
// matching Azerbaijan's standard 9-digit mobile number layout - purely
// cosmetic, the raw unspaced digits are what's actually stored/sent.
function formatPhoneDigits(digits: string): string {
  const groupSizes = [2, 3, 2, 2];
  const groups: string[] = [];
  let i = 0;
  for (const size of groupSizes) {
    if (i >= digits.length) break;
    groups.push(digits.slice(i, i + size));
    i += size;
  }
  return groups.join(' ');
}

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

  // Phone verification is mocked (no SMS provider wired up yet) - sending
  // a code always issues the fixed dev code 123456 server-side. See
  // backend/src/routes/operators.js for where a real provider would plug
  // in later.
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneVerifyError, setPhoneVerifyError] = useState('');

  useEffect(() => {
    if (operatorProfile) {
      setName(operatorProfile.name ?? '');
      setDescription(operatorProfile.description ?? '');
      setPhoneDigits((operatorProfile.phone ?? '').replace(PHONE_PREFIX, ''));
      setInstagram(operatorProfile.instagram ?? '');
    }
  }, [operatorProfile]);

  const fullPhone = `${PHONE_PREFIX}${phoneDigits.trim()}`;
  const isPhoneVerified = Boolean(operatorProfile?.phone_verified) && operatorProfile?.phone === fullPhone;

  function handlePhoneDigitsChange(value: string) {
    setPhoneDigits(value.replace(/\D/g, '').slice(0, PHONE_DIGIT_COUNT));
    // A pending code was issued for whatever number was last sent - once
    // the field is edited again that's stale, so make the user re-send
    // rather than letting them verify a number they've since changed.
    if (phoneCodeSent) {
      setPhoneCodeSent(false);
      setPhoneCode('');
    }
  }

  async function handleSendCode() {
    setPhoneVerifyError('');
    if (!phoneDigits.trim() || !/^\+994\d{9}$/.test(fullPhone)) {
      setPhoneVerifyError(t('profile.phoneInvalid'));
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch(`${API_URL}/api/operators/me/phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhoneVerifyError(data.error ?? t('profile.somethingWrong'));
        return;
      }
      setPhoneCodeSent(true);
      setPhoneCode('');
      showToast(t('profile.codeSentDevHint'));
    } catch {
      setPhoneVerifyError(t('profile.couldntReachBackend'));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    setPhoneVerifyError('');
    if (!phoneCode.trim()) return;
    setVerifyingCode(true);
    try {
      const res = await fetch(`${API_URL}/api/operators/me/phone/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: phoneCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhoneVerifyError(data.error ?? t('profile.somethingWrong'));
        return;
      }
      await refreshOperatorProfile();
      setPhoneCodeSent(false);
      setPhoneCode('');
      showToast(t('profile.verified'));
    } catch {
      setPhoneVerifyError(t('profile.couldntReachBackend'));
    } finally {
      setVerifyingCode(false);
    }
  }

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
    if (!/^\+994\d{9}$/.test(fullPhone)) {
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
        body: JSON.stringify({ name, description, phone: fullPhone, instagram: instagram.trim() || null }),
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
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
            {t('profile.phone')}
            {isPhoneVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent">
                <CheckCircle2 size={11} /> {t('profile.verified')}
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg px-3 py-2.5 shrink-0">
              <Phone size={13} /> {PHONE_PREFIX}
            </span>
            <input
              type="tel"
              value={formatPhoneDigits(phoneDigits)}
              onChange={(e) => handlePhoneDigitsChange(e.target.value)}
              placeholder={t('profile.phonePlaceholder')}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>

          {isEditing && !isPhoneVerified && (
            <div className="mt-2">
              {!phoneCodeSent ? (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || phoneDigits.length !== PHONE_DIGIT_COUNT}
                  className="text-xs font-semibold text-primary disabled:opacity-50"
                >
                  {sendingCode ? t('profile.sendingCode') : t('profile.sendCode')}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('profile.verificationCode')}
                    className="w-28 text-sm bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || !phoneCode.trim()}
                    className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {verifyingCode ? t('profile.verifying') : t('profile.verifyCode')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode}
                    className="text-xs font-semibold text-primary disabled:opacity-50"
                  >
                    {sendingCode ? t('profile.sendingCode') : t('profile.resendCode')}
                  </button>
                </div>
              )}
              {phoneVerifyError && <p className="text-[11px] text-danger mt-1">{phoneVerifyError}</p>}
            </div>
          )}
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
