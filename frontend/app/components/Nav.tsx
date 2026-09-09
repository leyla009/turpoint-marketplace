'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home, User, Send,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Locale } from '../lib/translations';
import AccountMenu, { type AccountSection } from './AccountMenu';
import AccountDetailModal from './AccountDetailModal';

// Plain language codes, not flag emoji - a flag maps to a country, not a
// language (and English in particular has no single flag for it), and
// flag emoji render as bare two-letter fallback text on systems without
// full color-emoji fonts anyway, which was showing "GB" for English.
const LANGUAGES: Locale[] = ['az', 'en', 'ru'];

const TRAVELER_ITEMS = [
  { href: '/', labelKey: 'nav.home' as const, Icon: Home },
];

// Operators only ever have the one page now - "Tur əlavə et" opens inside
// it as a popup, and profile editing is a section on the same page rather
// than its own route - so this exists solely to give the mobile bottom tab
// bar somewhere to link. Being length 1 also means the desktop header's own
// nav row (gated on navItems.length > 1 below) never renders "Panel" as a
// clickable link - there's nothing else to switch to.
const OPERATOR_ITEMS = [
  { href: '/dashboard', labelKey: 'nav.dashboard' as const, Icon: LayoutDashboard },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, operatorProfile, mode, setMode } = useAuth();
  const { locale, setLocale, t } = useLanguage();

  const navItems = mode === 'operator' ? OPERATOR_ITEMS : TRAVELER_ITEMS;

  // Clicking the avatar/name opens a small anchored dropdown ("pocket")
  // with 3 rows; picking one closes the dropdown and opens that section's
  // own focused modal. accountMenuOpen tracks WHICH trigger opened it
  // (desktop header vs mobile bottom bar) so the dropdown anchors itself
  // above or below correctly.
  const [accountMenuOpen, setAccountMenuOpen] = useState<'desktop' | 'mobile' | null>(null);
  const [activeSection, setActiveSection] = useState<AccountSection | null>(null);

  const openSection = (s: AccountSection) => {
    setActiveSection(s);
    setAccountMenuOpen(null);
  };

  // The homepage hero is a full-bleed photo slideshow, so the header floats
  // transparently over it until the page scrolls past the hero, then
  // switches to the normal solid bar. Every other page keeps the solid bar
  // from the start since there's no photo underneath it to float over -
  // except the operator panel, which has its own full-page photo background
  // (see (main)/dashboard/page.tsx) that's already position:fixed behind
  // everything, so the header can just stay transparent the whole time
  // there without needing the scroll-based toggle the homepage hero needs.
  const isHome = pathname === '/';
  const isOperatorPanel = pathname === '/dashboard';
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const HERO_SCROLL_THRESHOLD = 320;

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolledPastHero(window.scrollY > HERO_SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const transparent = (isHome && !scrolledPastHero) || isOperatorPanel;

  return (
    <>
      {/* Desktop top bar - on the homepage it's taken out of normal flow
          (fixed, not sticky) so the hero photo renders all the way up
          behind it with a truly transparent background, instead of the
          header reserving its own opaque strip above the photo. Once the
          page scrolls past the hero it switches to solid, still fixed. On
          the operator panel it stays sticky (that page's photo background
          is already fixed behind everything, so there's nothing to pull
          the header out of flow for) but goes transparent the same way,
          for the whole time you're on that page. */}
      <header
        className={`hidden md:block ${isHome ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 transition-colors duration-300 ${
          transparent ? 'bg-transparent' : 'bg-primary shadow-sm'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/15">
              <Send size={17} className="text-white -rotate-45" />
            </span>
            <span
              className="text-lg font-bold text-white leading-none"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              TurPoint
            </span>
          </Link>

          {/* A lone "Ana səhifə" link would be meaningless here - the logo
              already goes home, and travelers only have one page. Only
              show this row once there's more than one link (operator mode). */}
          {navItems.length > 1 && (
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
          )}

          <div className="flex items-center gap-3 shrink-0">
            {!loading && operatorProfile && (
              <div className="flex bg-white/15 rounded-full p-1">
                <button
                  onClick={() => {
                    setMode('traveler');
                    router.push('/');
                  }}
                  className={`px-3 text-xs font-semibold py-1 rounded-full transition-all ${
                    mode === 'traveler' ? 'bg-white text-primary shadow-sm' : 'text-white/80'
                  }`}
                >
                  {t('nav.traveler')}
                </button>
                <button
                  onClick={() => {
                    setMode('operator');
                    router.push('/dashboard');
                  }}
                  className={`px-3 text-xs font-semibold py-1 rounded-full transition-all ${
                    mode === 'operator' ? 'bg-white text-primary shadow-sm' : 'text-white/80'
                  }`}
                >
                  {t('nav.operator')}
                </button>
              </div>
            )}

            {/* Visible whether or not you're logged in - a logged-out
                visitor just needs to sign in/sign up first (the login page
                itself offers "Become an operator" once that's done),
                since creating a profile requires an account. */}
            {!loading && !operatorProfile && (
              <Link
                href={user ? '/dashboard' : '/login'}
                className="hidden lg:inline-flex items-center text-xs font-semibold text-white/90 hover:text-white border-b border-white/30 hover:border-white/70 pb-0.5 transition-colors"
              >
                {t('nav.becomeOperator')}
              </Link>
            )}

            {/* Language switcher - persists via LanguageContext (localStorage),
                every t()-driven string on the site re-renders in the new
                language immediately, no page reload needed. */}
            <div className="flex items-center gap-0.5 bg-white/15 rounded-full p-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  title={l.toUpperCase()}
                  aria-label={l.toUpperCase()}
                  className={`h-7 px-2.5 flex items-center justify-center rounded-full text-xs font-semibold leading-none transition-all ${
                    locale === l ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {!loading && user && (
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={() => setAccountMenuOpen((v) => (v === 'desktop' ? null : 'desktop'))}
                  className="flex items-center gap-2 group"
                >
                  <span className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="hidden lg:inline text-sm font-semibold text-white group-hover:opacity-80 truncate max-w-[100px]">
                    {user.name}
                  </span>
                </button>
                {accountMenuOpen === 'desktop' && (
                  <AccountMenu
                    anchor="below"
                    onSelect={openSection}
                    onClose={() => setAccountMenuOpen(null)}
                    onLogout={() => {
                      logout();
                      router.push('/');
                    }}
                  />
                )}
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

      {/* Mobile top bar - logo + language only. Mobile previously had no
          top header at all (only the homepage's own hero text stood in
          for it), which meant two real gaps: no brand mark on any inner
          page (tour detail, bookings, dashboard), and no way to change
          language at all on mobile - the language switcher only ever
          existed in the desktop-only header above. */}
      <div
        className={`md:hidden ${isHome ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 flex items-center justify-between px-4 h-12 transition-colors duration-300 ${
          transparent ? 'bg-transparent' : 'bg-primary'
        }`}
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/15 shrink-0">
            <Send size={13} className="text-white -rotate-45" />
          </span>
          <span
            className="text-sm font-bold text-white leading-none"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            TurPoint
          </span>
        </Link>
        <div className="flex items-center gap-0.5 bg-white/15 rounded-full p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              title={l.toUpperCase()}
              aria-label={l.toUpperCase()}
              className={`h-9 px-3 flex items-center justify-center rounded-full text-xs font-semibold leading-none transition-all ${
                locale === l ? 'bg-white text-primary shadow-sm' : 'text-white/80'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

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
          {!loading && user ? (
            <div className="flex-1 relative">
              <button
                onClick={() => setAccountMenuOpen((v) => (v === 'mobile' ? null : 'mobile'))}
                className="w-full flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">
                  {user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-[9px] font-semibold">{t('nav.account')}</span>
              </button>
              {accountMenuOpen === 'mobile' && (
                <AccountMenu
                  anchor="above"
                  onSelect={openSection}
                  onClose={() => setAccountMenuOpen(null)}
                  onLogout={() => {
                    logout();
                    router.push('/');
                  }}
                />
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                pathname === '/login' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={20} />
              <span className="text-[9px] font-semibold">{t('nav.logIn')}</span>
            </Link>
          )}
        </div>
      </nav>

      {activeSection && <AccountDetailModal section={activeSection} onClose={() => setActiveSection(null)} />}
    </>
  );
}
