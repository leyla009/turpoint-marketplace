'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Calendar, CalendarDays, Camera, Heart, Lock, LogOut, MapPin, User as UserIcon } from 'lucide-react';
import { useAuth, useRequireAuth, type AuthUser } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useToast } from '@/app/context/ToastContext';
import type { Locale, TranslationKey } from '@/app/lib/translations';
import { formatAzn, formatDate } from '@/app/lib/format';
import { photoSrc } from '@/app/lib/photo';
import { placeName, tourTitle } from '@/app/lib/tourContent';
import { countryOptions, DIAL_CODES, joinPhone, splitPhone } from '@/app/lib/countries';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const LANGUAGES: { code: Locale; name: string }[] = [
  { code: 'az', name: 'Azərbaycanca' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
];

// Backend error strings (routes/auth.js, lib/schemas.js) -> translated text.
const SERVER_ERRORS: Record<string, TranslationKey> = {
  'an account with this email already exists': 'ui.account.emailTaken',
  'a valid email address is required': 'ui.account.emailInvalid',
  'a valid phone number is required': 'ui.account.phoneInvalid',
  'first name cannot be empty': 'ui.account.firstNameRequired',
  'current password is incorrect': 'ui.account.currentWrong',
  'current password is required': 'ui.account.currentRequired',
  'new password must be different from the current one': 'ui.account.passwordSame',
  'new password must be at least 8 characters': 'ui.account.passwordTooShort',
  'new password must contain a digit': 'ui.account.passwordNeedsDigit',
  'new password must contain a symbol': 'ui.account.passwordNeedsSymbol',
  'password is incorrect': 'ui.account.deletePasswordWrong',
  'image must be 5 MB or smaller': 'ui.account.photoTooBig',
  'a valid image file is required': 'ui.account.photoInvalid',
};

type Section = 'info' | 'saved';

interface DetailsForm {
  first_name: string;
  last_name: string;
  email: string;
  dial: string;
  local: string;
  country: string;
  preferred_language: Locale;
}

function detailsFromUser(user: AuthUser, fallbackLanguage: Locale): DetailsForm {
  const { dial, local } = splitPhone(user.phone);
  return {
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    email: user.email,
    dial,
    local,
    country: user.country ?? '',
    preferred_language: user.preferred_language ?? fallbackLanguage,
  };
}

// 0 = nothing typed; 1-4 = weak..strong. The same three rules the server
// enforces (8+ chars, a digit, a symbol), plus a bonus for length or mixed case.
function passwordStrength(pw: string): number {
  if (!pw) return 0;
  const score =
    Number(pw.length >= 8) +
    Number(/\d/.test(pw)) +
    Number(/[^A-Za-z0-9\s]/.test(pw)) +
    Number(pw.length >= 12 || (/[a-z]/.test(pw) && /[A-Z]/.test(pw)));
  return pw.length < 8 ? Math.min(score, 1) || 1 : Math.max(score, 1);
}

const STRENGTH_COLOR = ['', 'bg-danger', 'bg-warning', 'bg-primary', 'bg-success'];

const inputClass =
  'w-full h-11 px-3 text-sm text-foreground bg-card border border-border rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-muted-foreground/70';

function Field({ label, htmlFor, extra, hint, children }: { label: string; htmlFor: string; extra?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-semibold text-navy mb-1.5">
        {label}
        {extra}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`bg-card border border-border rounded-2xl p-5 sm:p-6 scroll-mt-24 ${className}`}>{children}</section>;
}

export default function AccountPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { user, token, login, logout, updateUser } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const { showToast } = useToast();

  const [section, setSection] = useState<Section>('info');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'saved') setSection('saved');
  }, []);
  const goTo = (next: Section) => {
    setSection(next);
    window.history.replaceState(null, '', next === 'saved' ? '/account?tab=saved' : '/account');
  };

  const errorText = (msg: unknown) => {
    const key = typeof msg === 'string' ? SERVER_ERRORS[msg] : undefined;
    return t(key ?? 'ui.account.error');
  };
  const authHeader = { Authorization: `Bearer ${token}` };

  // ---- personal details ----------------------------------------------------
  const savedDetails = useMemo(() => (user ? detailsFromUser(user, locale) : null), [user, locale]);
  const [form, setForm] = useState<DetailsForm | null>(null);
  useEffect(() => {
    if (savedDetails && !form) setForm(savedDetails);
  }, [savedDetails, form]);
  const dirty = !!form && !!savedDetails && JSON.stringify(form) !== JSON.stringify(savedDetails);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const set = <K extends keyof DetailsForm>(key: K, value: DetailsForm[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setDetailsError('');
  };

  async function saveDetails() {
    if (!form || !dirty) return;
    if (!form.first_name.trim()) return setDetailsError(t('ui.account.firstNameRequired'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setDetailsError(t('ui.account.emailInvalid'));
    const phone = joinPhone(form.dial, form.local);
    if (phone === null) return setDetailsError(t('ui.account.phoneInvalid'));

    setSavingDetails(true);
    setDetailsError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone,
          country: form.country,
          preferred_language: form.preferred_language,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setDetailsError(errorText(data.error));
      login(data.token, data.user);
      setForm(detailsFromUser(data.user, locale));
      if (data.user.preferred_language && data.user.preferred_language !== locale) setLocale(data.user.preferred_language);
      showToast(t('ui.account.saved'));
    } catch {
      setDetailsError(t('ui.account.error'));
    } finally {
      setSavingDetails(false);
    }
  }

  // ---- photo -----------------------------------------------------------------
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function uploadPhoto(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showToast(t('ui.account.photoInvalid'), 'error');
    if (file.size > 5 * 1024 * 1024) return showToast(t('ui.account.photoTooBig'), 'error');
    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const res = await fetch(`${API_URL}/api/auth/me/photo`, { method: 'POST', headers: authHeader, body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(errorText(data.error), 'error');
      updateUser(data.user);
      showToast(t('ui.account.photoUpdated'));
    } catch {
      showToast(t('ui.account.error'), 'error');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me/photo`, { method: 'DELETE', headers: authHeader });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(errorText(data.error), 'error');
      updateUser(data.user);
      showToast(t('ui.account.photoRemoved'));
    } catch {
      showToast(t('ui.account.error'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  }

  // ---- password --------------------------------------------------------------
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const strength = passwordStrength(pw.next);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.current) return setPwError(t('ui.account.currentRequired'));
    if (pw.next.length < 8) return setPwError(t('ui.account.passwordTooShort'));
    if (!/\d/.test(pw.next)) return setPwError(t('ui.account.passwordNeedsDigit'));
    if (!/[^A-Za-z0-9\s]/.test(pw.next)) return setPwError(t('ui.account.passwordNeedsSymbol'));
    if (pw.next !== pw.confirm) return setPwError(t('ui.account.passwordMismatch'));

    setPwBusy(true);
    setPwError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ current_password: pw.current, new_password: pw.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setPwError(errorText(data.error));
      login(data.token, data.user);
      setPw({ current: '', next: '', confirm: '' });
      showToast(t('ui.account.passwordUpdated'));
    } catch {
      setPwError(t('ui.account.error'));
    } finally {
      setPwBusy(false);
    }
  }

  // ---- delete account ------------------------------------------------------
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!deletePw) return setDeleteError(t('ui.account.deletePasswordWrong'));
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ password: deletePw }),
      });
      if (res.status === 204) {
        logout();
        showToast(t('ui.account.deleted'));
        router.push('/');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.code === 'upcoming_bookings') setDeleteError(t('ui.account.deleteUpcoming', { count: data.count }));
      else if (data.code === 'operator_profile') setDeleteError(t('ui.account.deleteOperator'));
      else setDeleteError(errorText(data.error));
    } catch {
      setDeleteError(t('ui.account.error'));
    } finally {
      setDeleteBusy(false);
    }
  }

  // ---- saved tours -----------------------------------------------------------
  const [saved, setSaved] = useState<any[] | null>(null);
  useEffect(() => {
    if (section !== 'saved' || !token || saved) return;
    fetch(`${API_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSaved(Array.isArray(data) ? data : []))
      .catch(() => setSaved([]));
  }, [section, token, saved]);

  function unsave(id: number) {
    setSaved((prev) => prev?.filter((f) => f.id !== id) ?? prev);
    fetch(`${API_URL}/api/favorites/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }

  if (authLoading || !user || !form) {
    return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  const initials = ((user.first_name?.[0] ?? user.name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || '?';
  const avatar = photoSrc(user.photo_url);
  const countries = countryOptions(locale);

  const navItems: { key: string; label: string; Icon: typeof UserIcon; active?: boolean; onClick?: () => void; href?: string }[] = [
    { key: 'info', label: t('ui.account.navInfo'), Icon: UserIcon, active: section === 'info', onClick: () => { goTo('info'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
    {
      key: 'security',
      label: t('ui.account.navSecurity'),
      Icon: Lock,
      onClick: () => {
        goTo('info');
        requestAnimationFrame(() => document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' }));
      },
    },
    { key: 'bookings', label: t('ui.account.navBookings'), Icon: CalendarDays, href: '/bookings' },
    { key: 'saved', label: t('ui.account.navSaved'), Icon: Heart, active: section === 'saved', onClick: () => goTo('saved') },
    { key: 'notifications', label: t('ui.account.navNotifications'), Icon: Bell, href: '/notifications' },
  ];
  const navClass = (active?: boolean) =>
    `shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
      active ? 'bg-primary/10 text-navy' : 'text-foreground/80 hover:bg-muted'
    }`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10 pb-28 md:pb-12">
      <h1 className="text-3xl font-bold text-navy">{t('ui.account.title')}</h1>
      <p className="text-sm text-muted-foreground mt-1">{t('ui.account.subtitle')}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-5 lg:gap-6 mt-6 items-start">
        {/* Sidebar */}
        <nav aria-label={t('ui.account.title')} className="bg-card border border-border rounded-2xl p-2 lg:sticky lg:top-24">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
            {navItems.map(({ key, label, Icon, active, onClick, href }) => (
              <li key={key} className="shrink-0">
                {href ? (
                  <Link href={href} className={navClass(false)}>
                    <Icon size={16} className="text-foreground/60" /> {label}
                  </Link>
                ) : (
                  <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`w-full ${navClass(active)}`}>
                    <Icon size={16} className={active ? 'text-primary' : 'text-foreground/60'} /> {label}
                  </button>
                )}
              </li>
            ))}
            <li className="shrink-0 lg:mt-1 lg:pt-1 lg:border-t border-border">
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="w-full shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut size={16} /> {t('nav.logOut')}
              </button>
            </li>
          </ul>
        </nav>

        {section === 'saved' ? (
          <Card>
            <h2 className="text-lg font-bold text-navy mb-4">{t('ui.account.navSaved')}</h2>
            {saved === null ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.loading')}</p>
            ) : saved.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t('ui.account.savedEmpty')}</p>
                <Link href="/tours" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">
                  {t('ui.account.browseTours')}
                </Link>
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {saved.map((tour) => (
                  <li key={tour.id} className="relative flex gap-3 border border-border rounded-xl p-3 hover:border-primary/40 transition-colors">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                      {tour.photo_url && <img src={photoSrc(tour.photo_url) ?? ''} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    </div>
                    <Link href={`/tours/${tour.id}`} className="min-w-0 flex-1 pr-8">
                      <p className="text-sm font-semibold text-navy line-clamp-2">{tourTitle(tour, locale)}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        {tour.location && (
                          <>
                            <MapPin size={11} /> {placeName(tour.location, locale)}
                          </>
                        )}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar size={11} /> {formatDate(tour.date, locale)}
                      </p>
                      <p className="text-sm font-bold text-navy mt-1">{formatAzn(tour.price)}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => unsave(tour.id)}
                      aria-label={t('ui.account.removeSaved')}
                      title={t('ui.account.removeSaved')}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Heart size={16} className="fill-danger" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <div className="space-y-5 min-w-0">
            {/* Profile header */}
            <Card className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy}
                  aria-label={t(avatar ? 'ui.account.changePhoto' : 'ui.account.uploadPhoto')}
                  className="relative w-[72px] h-[72px] shrink-0 rounded-full disabled:opacity-60"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                      {initials}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-navy text-white border-2 border-card flex items-center justify-center">
                    <Camera size={13} />
                  </span>
                </button>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-navy truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  {user.created_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('ui.account.memberSince', { date: formatDate(user.created_at, locale, { month: 'long', year: 'numeric' }) })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 sm:shrink-0">
                {avatar && (
                  <button type="button" onClick={removePhoto} disabled={photoBusy} className="text-sm font-medium text-muted-foreground hover:text-danger disabled:opacity-50">
                    {t('ui.account.removePhoto')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy}
                  className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-navy hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {photoBusy ? t('ui.account.uploading') : t(avatar ? 'ui.account.changePhoto' : 'ui.account.uploadPhoto')}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
            </Card>

            {/* Personal details */}
            <Card>
              <h2 className="text-lg font-bold text-navy">{t('ui.account.detailsTitle')}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t('ui.account.detailsSub')}</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveDetails();
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 mt-5"
              >
                <Field label={t('ui.account.firstName')} htmlFor="first_name">
                  <input id="first_name" autoComplete="given-name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} maxLength={60} className={inputClass} />
                </Field>
                <Field label={t('ui.account.lastName')} htmlFor="last_name">
                  <input id="last_name" autoComplete="family-name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} maxLength={60} className={inputClass} />
                </Field>
                <Field label={t('ui.account.email')} htmlFor="email" hint={t('ui.account.emailHint')}>
                  <input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={254} className={inputClass} />
                </Field>
                <Field label={t('ui.account.phone')} htmlFor="phone" hint={t('ui.account.phoneHint')}>
                  <div className="flex gap-2">
                    <select
                      aria-label={t('ui.account.phoneCode')}
                      value={form.dial}
                      onChange={(e) => set('dial', e.target.value)}
                      className={`${inputClass} !w-[92px] shrink-0 px-2`}
                    >
                      {DIAL_CODES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="50 123 45 67"
                      value={form.local}
                      onChange={(e) => set('local', e.target.value.replace(/[^\d\s-]/g, ''))}
                      maxLength={20}
                      className={inputClass}
                    />
                  </div>
                </Field>
                <Field label={t('ui.account.country')} htmlFor="country">
                  <select id="country" autoComplete="country" value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass}>
                    <option value="">{t('ui.account.countryNone')}</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('ui.account.language')} htmlFor="language">
                  <select id="language" value={form.preferred_language} onChange={(e) => set('preferred_language', e.target.value as Locale)} className={inputClass}>
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {/* Enter in any field submits; the visible buttons live in the save bar below. */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
              </form>
            </Card>

            {/* Password */}
            <Card id="security">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-navy">{t('ui.account.passwordTitle')}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {user.password_changed_at && (
                      <>{t('ui.account.lastChanged', { date: formatDate(user.password_changed_at, locale) })} </>
                    )}
                    {t('ui.account.passwordRule')}
                  </p>
                </div>
                <button type="button" onClick={() => setShowPw((v) => !v)} className="shrink-0 text-sm font-semibold text-primary hover:underline">
                  {t(showPw ? 'ui.account.hidePasswords' : 'ui.account.showPasswords')}
                </button>
              </div>

              <form onSubmit={changePassword} className="mt-5 space-y-4">
                {/* Lets password managers attach the change to the right account. */}
                <input type="email" autoComplete="username" value={user.email} readOnly hidden />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                  <Field label={t('ui.account.currentPassword')} htmlFor="current_password">
                    <input
                      id="current_password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={pw.current}
                      onChange={(e) => {
                        setPw((p) => ({ ...p, current: e.target.value }));
                        setPwError('');
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  <div>
                    <Field label={t('ui.account.newPassword')} htmlFor="new_password">
                      <input
                        id="new_password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={pw.next}
                        onChange={(e) => {
                          setPw((p) => ({ ...p, next: e.target.value }));
                          setPwError('');
                        }}
                        aria-describedby="pw-strength"
                        className={inputClass}
                      />
                    </Field>
                    <div className="grid grid-cols-4 gap-1.5 mt-2" aria-hidden>
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={`h-1 rounded-full transition-colors ${i <= strength ? STRENGTH_COLOR[strength] : 'bg-border'}`} />
                      ))}
                    </div>
                    <p id="pw-strength" className="text-[11px] text-muted-foreground mt-1.5" aria-live="polite">
                      {strength ? t(`ui.account.strength${strength}` as TranslationKey) : t('ui.account.strengthHint')}
                    </p>
                  </div>
                  <Field label={t('ui.account.confirmPassword')} htmlFor="confirm_password">
                    <input
                      id="confirm_password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={pw.confirm}
                      onChange={(e) => {
                        setPw((p) => ({ ...p, confirm: e.target.value }));
                        setPwError('');
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>

                {pwError && (
                  <p role="alert" className="text-sm text-danger">
                    {pwError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-navy hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {pwBusy ? t('ui.account.updatingPassword') : t('ui.account.updatePassword')}
                </button>
              </form>
            </Card>

            {/* Delete account */}
            <section className="border border-danger/25 bg-danger/[0.03] rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-navy">{t('ui.account.deleteTitle')}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('ui.account.deleteSub')}</p>
                </div>
                {!deleteOpen && (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="self-start sm:self-auto shrink-0 h-10 px-4 rounded-lg border border-danger/40 bg-card text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
                  >
                    {t('ui.account.deleteTitle')}
                  </button>
                )}
              </div>
              {deleteOpen && (
                <form onSubmit={deleteAccount} className="mt-4 pt-4 border-t border-danger/20">
                  <p className="text-sm font-semibold text-navy">{t('ui.account.deleteConfirmTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('ui.account.deleteConfirmText')}</p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <input
                      type="password"
                      autoComplete="current-password"
                      aria-label={t('ui.account.currentPassword')}
                      placeholder={t('ui.account.currentPassword')}
                      value={deletePw}
                      onChange={(e) => {
                        setDeletePw(e.target.value);
                        setDeleteError('');
                      }}
                      autoFocus
                      className={`${inputClass} sm:max-w-xs`}
                    />
                    <button
                      type="submit"
                      disabled={deleteBusy}
                      className="h-11 px-4 rounded-lg bg-danger text-white text-sm font-semibold hover:bg-danger/90 transition-colors disabled:opacity-60"
                    >
                      {deleteBusy ? t('ui.account.deleting') : t('ui.account.deleteConfirmBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeletePw('');
                        setDeleteError('');
                      }}
                      className="h-11 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-navy hover:bg-muted transition-colors"
                    >
                      {t('ui.account.cancel')}
                    </button>
                  </div>
                  {deleteError && (
                    <p role="alert" className="text-sm text-danger mt-2">
                      {deleteError}
                    </p>
                  )}
                </form>
              )}
            </section>

            {/* Save bar - applies to Personal details */}
            <div className="sticky bottom-20 md:bottom-4 z-10 bg-card border border-border rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 shadow-sm">
              <p role="status" className={`text-sm ${detailsError ? 'text-danger' : dirty ? 'text-navy font-medium' : 'text-muted-foreground'}`}>
                {detailsError || t(dirty ? 'ui.account.unsaved' : 'ui.account.allSaved')}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setForm(savedDetails);
                    setDetailsError('');
                  }}
                  disabled={!dirty || savingDetails}
                  className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-navy hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {t('ui.account.cancel')}
                </button>
                <button
                  type="button"
                  onClick={saveDetails}
                  disabled={!dirty || savingDetails}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors disabled:bg-muted disabled:text-muted-foreground"
                >
                  {savingDetails ? t('ui.account.saving') : t('ui.account.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
