'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'login' | 'signup';
type Step = 'email' | 'details';
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
  // Booking.com-style progressive form: the email is asked for on its own
  // first, and only once it's valid does the rest of the form (password,
  // and name on signup) appear. This is purely a client-side staging of
  // the SAME single form - both submits still hit the existing one-shot
  // /api/auth/login or /api/auth/signup endpoint together, so it needed no
  // backend change and can't silently diverge from what the API expects.
  // There's no "does this email already have an account" check on the
  // backend, so - unlike Booking.com - the mode (sign in vs. register)
  // still has to be chosen explicitly rather than inferred from the email.
  const [step, setStep] = useState<Step>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
  // Tracks whether advancing to the "details" step pushed an extra
  // history entry that hasn't been consumed yet (by the user pressing
  // back, or by us stepping back to email ourselves) - see the popstate
  // effect and backToEmail/switchMode below.
  const pushedHistoryRef = useRef(false);

  // Read once on mount, client-side only (see sanitizeNext) - matches the
  // same window.location-based pattern the homepage uses for its own
  // deep-linking, which avoids Next's useSearchParams()/Suspense
  // requirement for what's a one-time read on a fully client page anyway.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(sanitizeNext(params.get('next')));
    if (params.get('mode') === 'signup') setMode('signup');
  }, []);

  // Without this, pressing the browser back button while on the
  // "password" step navigated straight off /login (probably to whatever
  // sent the user here, or out of the app entirely) instead of just
  // returning to the "email" step it visually followed from. Advancing to
  // "details" pushes one extra same-page history entry (see handleSubmit),
  // so a back-press there only pops that entry and fires popstate here
  // rather than actually leaving the page.
  useEffect(() => {
    function onPopState() {
      pushedHistoryRef.current = false;
      setStep('email');
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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

    if (step === 'email') {
      const error = validateField('email', email);
      setFieldErrors((p) => ({ ...p, email: error }));
      if (!error) {
        window.history.pushState({ turpointAuthStep: 'details' }, '');
        pushedHistoryRef.current = true;
        setStep('details');
      }
      return;
    }

    if (submitting) return; // guards against a double-click firing two signups/logins

    const errors: FieldErrors = {
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

  // Consumes the history entry pushed when advancing to "details" (see
  // handleSubmit) by actually navigating back through it, rather than just
  // setting state directly - otherwise that entry is left dangling, and
  // the next back-press would have to fire twice before it actually left
  // the page. The popstate listener above is what sets step back to
  // 'email' once this resolves.
  function stepBackToEmail() {
    if (pushedHistoryRef.current) {
      window.history.back();
    } else {
      setStep('email');
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    stepBackToEmail();
    setFieldErrors({});
    setAuthError('');
  }

  function backToEmail() {
    stepBackToEmail();
    setAuthError('');
    setFieldErrors((p) => ({ ...p, password: undefined, name: undefined }));
  }

  const isLoggedIn = !loading && !!user;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-[380px]">
        {isLoggedIn ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-3">
              {user!.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <h1 className="text-lg font-bold text-foreground mb-1">{user!.name}</h1>
            <p className="text-sm text-muted-foreground mb-6">{user!.email}</p>

            {operatorProfile && (
              <div className="flex bg-muted rounded-full p-1 mb-5">
                <button
                  onClick={() => setAccountMode('traveler')}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-all ${
                    accountMode === 'traveler' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t('nav.traveler')}
                </button>
                <button
                  onClick={() => setAccountMode('operator')}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-all ${
                    accountMode === 'operator' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t('nav.operator')}
                </button>
              </div>
            )}

            {!operatorProfile && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full text-sm font-semibold text-accent px-4 py-2.5 rounded-xl border border-accent/30 hover:bg-accent/5 transition-colors mb-3"
              >
                {t('nav.becomeOperator')}
              </button>
            )}

            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex items-center justify-center gap-1.5 w-full bg-muted text-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
            >
              <LogOut size={14} /> {t('nav.logOut')}
            </button>
          </div>
        ) : (
          <div>
            {/* Booking-context line - only appears when a protected page
                (see useRequireAuth in AuthContext.tsx) bounced the traveler
                here, so signing in never feels disconnected from whatever
                they were actually trying to do. Plain text, not another
                boxed banner - one visual container (the form itself) is
                enough on this page. */}
            {nextPath && (
              <p className="mb-3 text-sm font-medium text-primary">
                {wantsBooking ? t('login.contextBooking') : t('login.contextGeneric')}
              </p>
            )}

            <h1
              className="text-[26px] leading-tight font-bold text-foreground mb-1.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {mode === 'login' ? t('login.signInHeading') : t('login.createHeading')}
            </h1>
            <p className="text-sm text-muted-foreground mb-7">
              {mode === 'login' ? t('login.signInSubtitle') : t('login.createSubtitle')}
            </p>

            {authError && (
              <p role="alert" className="flex items-start gap-2 text-sm text-danger mb-4">
                <AlertCircle size={15} className="shrink-0 mt-0.5" /> {authError}
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {step === 'email' ? (
                <Field
                  id="email"
                  label={t('login.email')}
                  type="email"
                  value={email}
                  onChange={(v) => {
                    setEmail(v);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  onBlur={() => handleBlur('email', email)}
                  error={fieldErrors.email}
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t('login.emailPlaceholder')}
                  autoFocus
                />
              ) : (
                <div className="flex items-center justify-between gap-3 text-sm bg-muted/60 rounded-xl px-3.5 py-2.5">
                  <span className="text-foreground truncate">{email}</span>
                  <button
                    type="button"
                    onClick={backToEmail}
                    className="text-accent font-semibold text-xs shrink-0 hover:underline"
                  >
                    {t('login.changeEmail')}
                  </button>
                </div>
              )}

              {step === 'details' && (
                <>
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
                      autoFocus
                    />
                  )}

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
                    autoFocus={mode === 'login'}
                  />

                  {mode === 'login' && (
                    <div className="flex justify-end -mt-1">
                      <button
                        type="button"
                        onClick={() => showToast(t('login.forgotPasswordToast'))}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        {t('login.forgotPassword')}
                      </button>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground text-sm font-semibold px-4 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                {submitting
                  ? t('login.pleaseWait')
                  : step === 'email'
                  ? t('login.continue')
                  : mode === 'login'
                  ? t('login.logIn')
                  : t('login.signUp')}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === 'login' ? (
                <>
                  {t('login.noAccountQuestion')}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-accent font-semibold hover:underline"
                  >
                    {t('login.registerLink')}
                  </button>
                </>
              ) : (
                <>
                  {t('login.haveAccountQuestion')}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-accent font-semibold hover:underline"
                  >
                    {t('login.signInLink')}
                  </button>
                </>
              )}
            </p>
          </div>
        )}
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
        className={`w-full text-base bg-background border rounded-xl px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors ${
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
          className={`w-full text-base bg-background border rounded-xl pl-3.5 pr-11 py-2.5 text-foreground outline-none transition-colors ${
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
