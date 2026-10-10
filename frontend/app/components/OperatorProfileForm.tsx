'use client';

import { useEffect, useRef, useState } from 'react';
import { Store, Camera, AtSign, Phone, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

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

// The operator profile create/edit form - lives directly inside the panel
// page now instead of its own /dashboard/profile route (which one page it
// renders is decided by whether operatorProfile exists, same as before).
// Auth is already required by the panel page itself, so this component
// doesn't gate on it separately.
export default function OperatorProfileForm() {
  const { token, operatorProfile, setMode, refreshOperatorProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const isEditing = Boolean(operatorProfile);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [voen, setVoen] = useState('');
  const [businessCardLast4, setBusinessCardLast4] = useState('');
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
      setVoen(operatorProfile.voen ?? '');
      setBusinessCardLast4(operatorProfile.business_card_last4 ?? '');
      setPhoneDigits((operatorProfile.phone ?? '').replace(PHONE_PREFIX, ''));
      setInstagram(operatorProfile.instagram ?? '');
    }
  }, [operatorProfile]);

  const fullPhone = `${PHONE_PREFIX}${phoneDigits.trim()}`;
  // Real SMS verification does not exist yet (the backend answers 501 in production), so the
  // send-code / verify UI stays hidden unless NEXT_PUBLIC_PHONE_VERIFICATION=true is set.
  const verificationEnabled = process.env.NEXT_PUBLIC_PHONE_VERIFICATION === 'true';
  const isPhoneVerified = verificationEnabled && Boolean(operatorProfile?.phone_verified) && operatorProfile?.phone === fullPhone;

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
    if (!/^\d{10}$/.test(voen)) {
      setError(t('profile.voenInvalid'));
      return;
    }
    if (!/^\d{4}$/.test(businessCardLast4)) {
      setError(t('profile.demoCardInvalid'));
      return;
    }
    setSubmitting(true);
    try {
      const url = isEditing ? `${API_URL}/api/operators/${operatorProfile!.id}` : `${API_URL}/api/operators`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, phone: fullPhone, instagram: instagram.trim() || null, voen, business_card_last4: businessCardLast4 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('profile.somethingWrong'));
        return;
      }
      await refreshOperatorProfile();
      setSuccess(true);
      if (!isEditing) setMode('operator');
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

  return (
    <div className={isEditing ? '' : 'grid overflow-hidden rounded-3xl border border-border bg-card shadow-lift md:grid-cols-[0.9fr_1.1fr]'}>
      {!isEditing && (
        <aside className="relative isolate flex min-h-[560px] flex-col overflow-hidden bg-navy px-6 py-7 text-white sm:px-9 sm:py-9 md:min-h-[720px] md:px-8 md:py-10 lg:px-10">
          <img
            src="/pictures/1.webp"
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/75 via-navy/65 to-primary/90" />
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-sm">
              <Store size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-lg font-bold leading-tight">TurPoint</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
                {t('profile.onboardingEyebrow')}
              </p>
            </div>
          </div>

          <div className="mt-10 max-w-md md:mt-14">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('profile.onboardingTitle')}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
              {t('profile.onboardingBody')}
            </p>
          </div>

          <div className="mt-8 space-y-3 text-sm font-medium text-white/95">
            {(['profile.onboardingBenefitTours', 'profile.onboardingBenefitBookings', 'profile.onboardingBenefitContact'] as const).map((key) => (
              <div key={key} className="flex items-center gap-2.5">
                <CheckCircle2 size={17} className="shrink-0 text-teal-200" aria-hidden="true" />
                <span>{t(key)}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-10">
            <div className="max-w-sm rounded-2xl border border-white/20 bg-white/95 p-4 text-foreground shadow-lift backdrop-blur-md sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                  {operatorProfile?.photo_url ? (
                    <img src={`${API_URL}${operatorProfile.photo_url}`} alt="" className="h-full w-full object-cover" />
                  ) : name.trim() ? (
                    <span className="font-display text-lg font-bold">{name.trim()[0].toUpperCase()}</span>
                  ) : (
                    <Store size={21} aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    {t('profile.previewLabel')}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-foreground">
                    {name.trim() || t('profile.previewName')}
                  </p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                {description.trim() || t('profile.previewDescription')}
              </p>
              {(phoneDigits || instagram.trim()) && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {phoneDigits && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <Phone size={12} aria-hidden="true" /> {PHONE_PREFIX} {formatPhoneDigits(phoneDigits)}
                    </span>
                  )}
                  {instagram.trim() && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <AtSign size={12} aria-hidden="true" /> {instagram.trim()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      <div className={isEditing ? '' : 'min-w-0 bg-card px-5 py-6 sm:px-8 sm:py-9 md:px-8 md:py-10 lg:px-10'}>
      <div className="flex items-center gap-3 mb-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Store size={19} aria-hidden="true" />
        </span>
        <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
          {isEditing ? t('profile.editProfileTitle') : t('profile.becomeOperatorTitle')}
        </h1>
      </div>
      {isEditing && (
        <p className="mb-5 ml-[52px] text-sm leading-6 text-muted-foreground">
          {t('profile.editSubtitle')}
        </p>
      )}

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

      <form
        onSubmit={handleSubmit}
        className={isEditing ? 'max-w-lg space-y-3 rounded-xl border border-border bg-card p-4' : 'space-y-4'}
      >
        <div className={isEditing ? 'space-y-3' : 'space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5'}>
          <div>
            <label htmlFor="operator-name" className="mb-1.5 block text-sm font-semibold text-foreground">{t('profile.companyName')}</label>
            <input
              id="operator-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Qafqaz Tours"
              autoComplete="organization"
              className="w-full rounded-lg border border-border bg-card px-3.5 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="operator-description" className="mb-1.5 block text-sm font-semibold text-foreground">{t('profile.description')}</label>
            <textarea
              id="operator-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('profile.descriptionPlaceholder')}
              rows={3}
              className="w-full resize-y rounded-lg border border-border bg-card px-3.5 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
          </div>
        </div>

        <div className={isEditing ? 'space-y-3 rounded-xl border border-border bg-card p-4' : 'space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5'}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('profile.businessDetails')}</p>
          <div>
            <label htmlFor="operator-voen" className="mb-1.5 block text-sm font-semibold text-foreground">{t('profile.voen')}</label>
            <input
              id="operator-voen"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={voen}
              onChange={(e) => setVoen(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="1234567890"
              className="w-full rounded-lg border border-border bg-card px-3.5 py-3 text-base text-foreground outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{t('profile.voenHint')}</p>
          </div>
          <div>
            <label htmlFor="operator-demo-card" className="mb-1.5 block text-sm font-semibold text-foreground">{t('profile.demoCard')}</label>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="rounded-lg border border-border bg-card px-3.5 py-3 font-mono text-sm text-muted-foreground">•••• •••• ••••</span>
              <input
                id="operator-demo-card"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={businessCardLast4}
                onChange={(e) => setBusinessCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                aria-label={t('profile.demoCardLast4')}
                className="w-24 rounded-lg border border-border bg-card px-3.5 py-3 font-mono text-base text-foreground outline-none focus:border-primary"
              />
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{t('profile.demoCardHint')}</p>
          </div>
        </div>

        <div className={isEditing ? 'space-y-3' : 'space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5'}>
          {!isEditing && <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('profile.sectionContact')}</p>}
          <div>
            <label htmlFor="operator-phone" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {t('profile.phone')}
              {isPhoneVerified && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent">
                  <CheckCircle2 size={11} /> {t('profile.verified')}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3 text-sm font-semibold text-muted-foreground">
                <Phone size={14} aria-hidden="true" /> {PHONE_PREFIX}
              </span>
              <input
                id="operator-phone"
                type="tel"
                value={formatPhoneDigits(phoneDigits)}
                onChange={(e) => handlePhoneDigitsChange(e.target.value)}
                placeholder={t('profile.phonePlaceholder')}
                autoComplete="tel-national"
                className="w-full rounded-lg border border-border bg-card px-3.5 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
              />
            </div>

            {verificationEnabled && isEditing && !isPhoneVerified && (
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
                      className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifyingCode || !phoneCode.trim()}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
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
                {phoneVerifyError && <p className="mt-1 text-[11px] text-danger">{phoneVerifyError}</p>}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="operator-instagram" className="mb-1.5 block text-sm font-semibold text-foreground">{t('profile.instagram')}</label>
            <div className="flex items-center gap-2">
              <span className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-card px-3.5 py-3 text-sm font-semibold text-muted-foreground">
                <AtSign size={16} aria-hidden="true" />
              </span>
              <input
                id="operator-instagram"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ''))}
                placeholder={t('profile.instagramPlaceholder')}
                className="w-full rounded-lg border border-border bg-card px-3.5 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {!isEditing && (
          <p className="flex items-start gap-2 rounded-xl bg-muted px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            <Camera size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> {t('profile.photoHint')}
          </p>
        )}

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        {success && <p className="text-sm font-semibold text-accent">{t('profile.saved')}</p>}

        <button
          type="submit"
          disabled={submitting}
          className={isEditing
            ? 'w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50'
            : 'w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50'}
        >
          {submitting ? t('profile.saving') : isEditing ? t('profile.saveChanges') : t('profile.createProfile')}
        </button>
      </form>

      {!isEditing && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-foreground">{t('profile.onboardingStepTitle')}</p>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">{t('profile.onboardingStepCount')}</span>
          </div>
          <nav className="mt-3" aria-label={t('profile.onboardingStepTitle')}>
            <ol className="grid grid-cols-3 gap-2">
              {(['profile.onboardingStepProfile', 'profile.onboardingStepTour', 'profile.onboardingStepBookings'] as const).map((key, index) => (
                <li key={key} aria-current={index === 0 ? 'step' : undefined}>
                  <div className={`h-1.5 rounded-full ${index === 0 ? 'bg-primary' : 'bg-border'}`} />
                  <p className={`mt-2 text-[10px] font-semibold leading-4 sm:text-xs ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {index + 1}. {t(key)}
                  </p>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}
      </div>
    </div>
  );
}
