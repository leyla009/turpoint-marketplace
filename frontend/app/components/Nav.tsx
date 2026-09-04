'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home, Ticket, User, LogOut, Send,
  LayoutDashboard, PlusCircle, ClipboardList, Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Locale } from '../lib/translations';

// How far (px) you can scroll down the homepage before the transparent
// hero nav switches to its solid background - roughly the hero's height.
const HERO_SCROLL_THRESHOLD = 260;

const LANGUAGES: { locale: Locale; flag: string }[] = [
  { locale: 'az', flag: '🇦🇿' },
  { locale: 'en', flag: '🇬🇧' },
  { locale: 'ru', flag: '🇷🇺' },
];

const TRAVELER_ITEMS = [
  { href: '/', labelKey: 'nav.home' as const, Icon: Home },
  { href: '/bookings', labelKey: 'nav.bookings' as const, Icon: Ticket },
];

const OPERATOR_ITEMS = [
  { href: '/dashboard', labelKey: 'nav.dashboard' as const, Icon: LayoutDashboard },
  { href: '/dashboard/new-tour', labelKey: 'nav.addTour' as const, Icon: PlusCircle },
  { href: '/dashboard/bookings', labelKey: 'nav.operatorBookings' as const, Icon: ClipboardList },
  { href: '/dashboard/profile', labelKey: 'nav.profile' as const, Icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, operatorProfile, mode, setMode } = useAuth();
  const { locale, setLocale, t } = useLanguage();

  const navItems = mode === 'operator' ? OPERATOR_ITEMS : TRAVELER_ITEMS;

  // The homepage hero is a full-bleed photo slideshow the nav floats over
  // transparently (see page.tsx's -mt-16 overlap); every other page, and
  // the homepage itself once scrolled past the hero, gets the solid bar.
  const isHome = pathname === '/';
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolledPastHero(window.scrollY > HERO_SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const transparent = isHome && !scrolledPastHero;

  return (
    <>
      {/* Desktop top bar */}
      <header
        className={`hidden md:block sticky top-0 z-40 transition-colors duration-300 ${
          transparent
            ? 'bg-gradient-to-b from-black/45 via-black/15 to-transparent'
            : 'bg-gradient-to-r from-primary to-[#2E5B47] shadow-md'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/15">
              <Send size={17} className="text-white -rotate-45" />
            </span>
            <span className="flex flex-col leading-none">
              <span
                className="text-lg font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                TurPoint
              </span>
              <span className="text-[10px] text-white/70 tracking-wide">{t('nav.tagline')}</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            {navItems.map(({ href, labelKey }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-semibold pb-0.5 border-b-2 transition-colors ${
                    active
                      ? 'text-white border-white'
                      : 'text-white/80 border-transparent hover:text-white'
                  }`}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {/* Language switcher - persists via LanguageContext (localStorage),
                every t()-driven string on the site re-renders in the new
                language immediately, no page reload needed. */}
            <div className="flex items-center gap-0.5 bg-white/15 rounded-full p-1">
              {LANGUAGES.map(({ locale: l, flag }) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  title={l.toUpperCase()}
                  aria-label={l.toUpperCase()}
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-sm leading-none transition-all ${
                    locale === l ? 'bg-white shadow-sm' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>

            {!loading && operatorProfile && (
              <div className="flex bg-white/15 rounded-full p-1">
                <button
                  onClick={() => setMode('traveler')}
                  className={`px-3 text-xs font-semibold py-1 rounded-full transition-all ${
                    mode === 'traveler' ? 'bg-white text-primary shadow-sm' : 'text-white/80'
                  }`}
                >
                  {t('nav.traveler')}
                </button>
                <button
                  onClick={() => setMode('operator')}
                  className={`px-3 text-xs font-semibold py-1 rounded-full transition-all ${
                    mode === 'operator' ? 'bg-white text-primary shadow-sm' : 'text-white/80'
                  }`}
                >
                  {t('nav.operator')}
                </button>
              </div>
            )}

            {!loading && user && !operatorProfile && (
              <Link
                href="/dashboard/profile"
                className="hidden lg:inline-block text-[11px] font-semibold text-white/80 hover:text-white"
              >
                {t('nav.becomeOperator')}
              </Link>
            )}

            {!loading && user && (
              <div className="flex items-center gap-2">
                <Link href="/login" className="flex items-center gap-2 group">
                  <span className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="hidden lg:inline text-sm font-semibold text-white group-hover:opacity-80 truncate max-w-[100px]">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  title={t('nav.logOut')}
                  className="text-white/70 hover:text-white p-1.5"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}

            {!loading && !user && (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full border border-white/70 text-white text-sm font-semibold px-5 py-2 hover:bg-white/10 transition-colors"
              >
                {t('nav.signIn')} <User size={15} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav — mirrors whatever mode is set on desktop /
          the account page; no room for the pill switcher itself here. */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex">
          {navItems.map(({ href, labelKey, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={20} />
                <span className="text-[9px] font-semibold">{t(labelKey)}</span>
              </Link>
            );
          })}
          <Link
            href="/login"
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              pathname === '/login' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {!loading && user ? (
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            ) : (
              <User size={20} />
            )}
            <span className="text-[9px] font-semibold">{!loading && user ? t('nav.account') : t('nav.logIn')}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
