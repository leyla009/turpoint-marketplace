'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import HeroSlideshow from '../../components/HeroSlideshow';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'login' | 'signup';
type FieldErrors = { name?: string; email?: string; password?: string };

// Only ever redirect back to a path on this same site - a `next` value
// like "https://evil.example" or "//evil.example" must never be honored,
// or a crafted /login?next=... link could send a freshly-authenticated
// session straight to another origin.
function sanitizeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, logout, operatorProfile, mode: accountMode, setMode: setAccountMode } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  // Read once on mount, client-side only (see sanitizeNext) - matches the
  // same window.location-based pattern the homepage uses for its own
  // deep-linking, which avoids Next's useSearchParams()/Suspense
  // requirement for what's a one-time read on a fully client page anyway.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(sanitizeNext(params.get('next')));
    if (params.get('mode') === 'signup') setMode('signup');
  }, []);


  const wantsBooking = !!nextPath && /\/tours\/.+\/book/.test(nextPath);

  function validateField(field: 'name' | 'email' | 'password', value: string): string | undefined {
    if (field === 'name') {
      if (mode === 'signup' && !value.trim()) return t('login.errorNameRequired');
      return undefined;
    }
    if (field === 'email') {
      if (!value.trim()) return t('login.errorEmailRequired');
      if (!EMAIL_PATTERN.test(value.trim())) return t('login.errorEmailInvalid');
      return undefined;
    }
    if (!value) return t('login.errorPasswordRequired');
    if (mode === 'signup' && value.length < 6) return t('login.errorPasswordTooShort');
    return undefined;
  }

  // Only validates on blur if there's already something typed - leaving an
  // untouched, still-empty field must never show a "required" error here.
  // Besides being naggy, that error's arrival shifts everything below it
  // down the page at the exact moment a mouseup can land - a real click on
  // e.g. the Register link right below can silently miss its new position.
  // "Required" is instead enforced once, at submit/continue time.
  function handleBlur(field: 'name' | 'email' | 'password', value: string) {
    if (!value.trim()) return;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  // Maps the backend's already-safe, already-generic error strings (never
  // a raw DB/stack-trace message - see auth.js) to a translated, friendly
  // sentence. Login intentionally stays as one generic "incorrect email or
  // password" regardless of which half was wrong, matching the backend's
  // own choice not to reveal whether an email is registered.
  function mapAuthError(raw: string): string {
    switch (raw) {
      case 'invalid email or password':
        return t('login.errorInvalidCredentials');
      case 'an account with this email already exists':
        return t('login.errorEmailTaken');
      case 'password must be at least 6 characters':
        return t('login.errorPasswordTooShort');
      case 'name, email, and password are required':
      case 'email and password are required':
        return t('login.errorMissingFields');
      default:
        return t('login.somethingWrong');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (submitting) return; // guards against a double-click firing two signups/logins

    const errors: FieldErrors = {
      email: validateField('email', email),
      password: validateField('password', password),
      ...(mode === 'signup' ? { name: validateField('name', name) } : {}),
    };
    setFieldErrors((p) => ({ ...p, ...errors }));
    if (Object.values(errors).some(Boolean)) return;

    setAuthError('');
    setSubmitting(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = mode === 'login' ? { email, password } : { name, email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(mapAuthError(data.error ?? ''));
        return;
      }
      login(data.token, data.user);
      showToast(mode === 'login' ? t('login.welcomeToast', { name: data.user.name }) : t('login.accountCreatedToast'));
      router.push(nextPath || '/');
    } catch {
      setAuthError(t('login.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setFieldErrors({});
    setAuthError('');
  }

  const isLoggedIn = !loading && !!user;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        {/* Photo panel */}
        <div className="relative hidden md:block min-h-[560px] bg-navy">
          <HeroSlideshow />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-8 text-white">
            <h2 className="text-2xl font-bold">{t('ui.login.welcome')}</h2>
            <p className="text-sm text-white/80 mt-1.5 max-w-xs">{t('ui.login.welcomeBody')}</p>
          </div>
        </div>

        <div className="p-6 sm:p-10 flex flex-col justify-center">
          {isLoggedIn ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-3">
                {user!.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <h1 className="text-lg font-bold text-foreground mb-1">{user!.name}</h1>
              <p className="text-sm text-muted-foreground mb-6">{user!.email}</p>

              {operatorProfile && (
                <div className="flex bg-muted rounded-lg p-1 mb-5">
                  {(['traveler', 'operator'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setAccountMode(m)}
                      className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
                        accountMode === m ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      {t(m === 'operator' ? 'nav.operator' : 'nav.traveler')}
                    </button>
                  ))}
                </div>
              )}

              {!operatorProfile && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-sm font-semibold text-primary px-4 py-2.5 rounded-lg border border-primary hover:bg-primary/5 transition-colors mb-3"
                >
                  {t('ui.nav.becomeOperator')}
                </button>
              )}

              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="flex items-center justify-center gap-1.5 w-full bg-muted text-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-80 transition-opacity"
              >
                <LogOut size={14} /> {t('nav.logOut')}
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm mx-auto">
              {/* Sign in / Create account tabs */}
              <div className="flex border-b border-border mb-6">
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => mode !== m && switchMode(m)}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                      mode === m ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m === 'login' ? t('ui.login.signInTab') : t('ui.login.createTab')}
                  </button>
                ))}
              </div>

              {nextPath && (
                <p className="mb-3 text-sm font-medium text-primary">
                  {wantsBooking ? t('login.contextBooking') : t('login.contextGeneric')}
                </p>
              )}

              <h1 className="text-xl font-bold text-foreground mb-1">
                {mode === 'login' ? t('login.signInHeading') : t('login.createHeading')}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {mode === 'login' ? t('login.signInSubtitle') : t('login.createSubtitle')}
              </p>

              {authError && (
                <p role="alert" className="flex items-start gap-2 text-sm text-danger mb-4">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" /> {authError}
                </p>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'signup' && (
                  <Field
                    id="name"
                    label={t('login.fullName')}
                    type="text"
                    value={name}
                    onChange={(v) => {
                      setName(v);
                      if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                      if (authError) setAuthError('');
                    }}
                    onBlur={() => handleBlur('name', name)}
                    error={fieldErrors.name}
                    autoComplete="name"
                    placeholder={t('login.fullNamePlaceholder')}
                  />
                )}

                <Field
                  id="email"
                  label={t('login.email')}
                  type="email"
                  value={email}
                  onChange={(v) => {
                    setEmail(v);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    if (authError) setAuthError('');
                  }}
                  onBlur={() => handleBlur('email', email)}
                  error={fieldErrors.email}
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t('login.emailPlaceholder')}
                  autoFocus
                />

                <PasswordField
                  id="password"
                  label={t('login.password')}
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                    if (authError) setAuthError('');
                  }}
                  onBlur={() => handleBlur('password', password)}
                  error={fieldErrors.password}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  showLabel={t('login.showPassword')}
                  hideLabel={t('login.hidePassword')}
                  hint={mode === 'signup' ? t('login.passwordHint') : undefined}
                  hintMet={mode === 'signup' ? password.length >= 6 : undefined}
                />

                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => showToast(t('login.forgotPasswordToast'))}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-4 py-3 rounded-lg transition-colors disabled:opacity-60"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? t('login.pleaseWait') : mode === 'login' ? t('login.logIn') : t('login.signUp')}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === 'login' ? t('login.noAccountQuestion') : t('login.haveAccountQuestion')}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-primary font-semibold hover:underline"
                >
                  {mode === 'login' ? t('login.registerLink') : t('login.signInLink')}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared text/email input: a real <label> (never placeholder-only), an
// error rendered below and wired via aria-describedby/aria-invalid so a
// screen reader announces it as soon as the field is blamed, and a border
// that turns danger-colored the same moment. text-base (not text-sm) on
// the input itself specifically - iOS Safari zooms the whole page in on
// focus for any input rendering smaller than 16px, which text-sm (14px)
// is.
function Field({
  id,
  label,
  type,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  inputMode,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  autoComplete?: string;
  inputMode?: 'email' | 'text';
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full text-base bg-background border rounded-lg px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors ${
          error ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  show,
  onToggleShow,
  autoComplete,
  showLabel,
  hideLabel,
  hint,
  hintMet,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
  hint?: string;
  hintMet?: boolean;
  autoFocus?: boolean;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          className={`w-full text-base bg-background border rounded-lg pl-3.5 pr-11 py-2.5 text-foreground outline-none transition-colors ${
            error ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'
          }`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? hideLabel : showLabel}
          aria-pressed={show}
          className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger mt-1.5">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={`text-xs mt-1.5 ${hintMet ? 'text-success' : 'text-muted-foreground'}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
