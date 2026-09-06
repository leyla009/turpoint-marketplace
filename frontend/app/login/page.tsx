'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, logout, operatorProfile, mode: accountMode, setMode: setAccountMode } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
        setError(data.error ?? t('login.somethingWrong'));
        return;
      }
      login(data.token, data.user);
      router.push('/');
    } catch {
      setError(t('login.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
  }

  const isLoggedIn = !loading && !!user;

  return (
    // min-h-screen (not min-h-full) - this page sits in a flex column with
    // Nav/Footer whose own height is content-driven, so `full` would
    // resolve against a collapsed ancestor and the grid below would size
    // itself to the (short) form panel, squashing the image panel's
    // absolutely-positioned Image and its text into far too little height.
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel - desktop only. Reuses one of the same hero photos as
          the homepage slideshow so the auth screen doesn't feel like a
          disconnected, generic form page bolted onto a travel site. */}
      <div className="hidden lg:block relative overflow-hidden">
        <Image
          src="/pictures/2.webp"
          alt="Baku skyline and Flame Towers at night"
          fill
          sizes="50vw"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-black/50" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 2px, transparent 2px 14px)' }}
        />
        <div className="relative h-full flex flex-col justify-between p-10 xl:p-14">
          <span
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            TurPoint
          </span>
          <div>
            <h2
              className="text-3xl xl:text-4xl font-bold text-white mb-3 max-w-md"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t('login.brandHeadline')}
            </h2>
            <p className="text-sm text-white/80 max-w-sm">{t('login.brandBody')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-4 py-16">
        {isLoggedIn ? (
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-3">
              {user!.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <h1 className="font-display text-lg font-bold text-foreground mb-1">{user!.name}</h1>
            <p className="text-sm text-muted-foreground mb-5">{user!.email}</p>

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
                onClick={() => router.push('/dashboard/profile')}
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
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 max-w-sm w-full">
            <h1 className="font-display text-xl font-bold text-foreground mb-1">
              {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
            </h1>
            <p className="text-sm text-muted-foreground mb-5">
              {mode === 'login' ? t('login.loginSubtitle') : t('login.signupSubtitle')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('login.fullName')}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email')}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
              />

              {error && <p className="text-xs text-danger">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? t('login.pleaseWait') : mode === 'login' ? t('login.logIn') : t('login.signUp')}
              </button>
            </form>

            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4"
            >
              {mode === 'login' ? t('login.noAccount') : t('login.haveAccount')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
