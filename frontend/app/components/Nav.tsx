'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Home, User, Compass, Sparkles, Ticket, Heart, Globe, ChevronDown, Check, LayoutDashboard, ArrowLeftRight, FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Locale, TranslationKey } from '../lib/translations';
import AccountMenu, { type AccountSection } from './AccountMenu';
import AccountDetailModal from './AccountDetailModal';
import { photoSrc } from '../lib/photo';
import NotificationBell from './NotificationBell';
import Logo from './Logo';

// Plain language codes, not flag emoji - a flag maps to a country, not a
// language, and flag emoji render as bare letters on systems without
// color-emoji fonts anyway.
const LANGUAGES: Locale[] = ['az', 'en', 'ru'];

const TRAVELER_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: '/tours', labelKey: 'ui.nav.explore' },
  { href: '/planner', labelKey: 'ui.nav.planner' },
];

const OPERATOR_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard' },
];

function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-lg text-xs font-semibold text-foreground/80 hover:text-primary hover:bg-muted transition-colors ${
          compact ? 'h-9 px-2' : 'h-9 px-2.5'
        }`}
      >
        <Globe size={15} className="text-foreground/60" />
        {locale.toUpperCase()}
        <ChevronDown size={13} className="text-foreground/50" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-28 bg-card border border-border rounded-xl shadow-lift py-1 z-50"
        >
          {LANGUAGES.map((l) => (
            <li key={l}>
              <button
                role="option"
                aria-selected={locale === l}
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.toUpperCase()}
                {locale === l && <Check size={14} className="text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, mode, setMode } = useAuth();
  const { t } = useLanguage();

  const links = mode === 'operator' ? OPERATOR_LINKS : TRAVELER_LINKS;

  // Clicking the avatar opens a small anchored dropdown; picking a row
  // opens that section's own modal. accountMenuOpen tracks WHICH trigger
  // opened it (desktop header vs mobile bottom bar) so it anchors correctly.
  const [accountMenuOpen, setAccountMenuOpen] = useState<'desktop' | 'mobile' | null>(null);
  const [activeSection, setActiveSection] = useState<AccountSection | null>(null);

  // "Personal info" is a full page (/account); saved tours stay a quick modal.
  const openSection = (s: AccountSection) => {
    setAccountMenuOpen(null);
    if (s === 'info') router.push('/account');
    else setActiveSection(s);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isActive = (href: string) =>
    href.startsWith('/#') ? false : pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  const mobileTabs: { href: string; labelKey: TranslationKey; Icon: typeof Home }[] =
    mode === 'operator'
      ? [{ href: '/dashboard', labelKey: 'nav.dashboard', Icon: LayoutDashboard }]
      : [
          { href: '/', labelKey: 'nav.home', Icon: Home },
          { href: '/tours', labelKey: 'ui.nav.explore', Icon: Compass },
          { href: '/planner', labelKey: 'ui.nav.plannerShort', Icon: Sparkles },
          { href: '/bookings', labelKey: 'ui.nav.trips', Icon: Ticket },
        ];

  return (
    <>
      {/* Desktop header - solid white, sticky. */}
      <header className="hidden md:block sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">
          <Logo href={mode === 'operator' ? '/dashboard' : '/'} />

          <nav className="flex items-center gap-1">
            {links.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href) ? 'text-primary bg-primary/5' : 'text-foreground/75 hover:text-primary'
                }`}
              >
                {t(labelKey)}
              </Link>
            ))}
            <Link
              href="/know-before-you-go"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                isActive('/know-before-you-go')
                  ? 'bg-primary-hover text-primary-foreground ring-2 ring-primary/20'
                  : 'bg-primary text-primary-foreground hover:bg-primary-hover'
              }`}
            >
              <FileText size={15} />
              {t('tourDetail.knowBeforeYouGo')}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {!loading && user?.account_type === 'operator' && (
              <div className="flex bg-muted rounded-lg p-0.5 mr-1">
                {(['traveler', 'operator'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      router.push(m === 'operator' ? '/dashboard' : '/');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      mode === m ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t(m === 'operator' ? 'nav.operator' : 'nav.traveler')}
                  </button>
                ))}
              </div>
            )}

            {mode !== 'operator' && (
              <button
                onClick={() => (user ? openSection('favorites') : router.push('/login'))}
                aria-label={t('account.favorites')}
                title={t('account.favorites')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/70 hover:text-primary hover:bg-muted transition-colors"
              >
                <Heart size={17} />
              </button>
            )}

            {!loading && user && <NotificationBell />}

            <LanguageMenu />

            {!loading && !user && (
              <Link
                href="/login"
                className="ml-1 inline-flex items-center h-9 px-4 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                {t('nav.signIn')}
              </Link>
            )}

            {!loading && !user && (
              <Link
                href="/login?mode=signup&account_type=operator"
                className="ml-1 inline-flex items-center h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors"
              >
                {t('ui.nav.becomeOperator')}
              </Link>
            )}

            {!loading && user && (
              <div className="relative ml-1">
                <button
                  onClick={() => setAccountMenuOpen((v) => (v === 'desktop' ? null : 'desktop'))}
                  className="flex items-center gap-1.5 rounded-full hover:bg-muted pl-0.5 pr-1.5 py-0.5 transition-colors"
                  aria-label={t('nav.account')}
                >
                  {user.photo_url ? (
                    <img src={photoSrc(user.photo_url) ?? ''} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {user.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}
                  <ChevronDown size={14} className="text-foreground/50" />
                </button>
                {accountMenuOpen === 'desktop' && (
                  <AccountMenu
                    anchor="below"
                    showTravelerItems={mode !== 'operator'}
                    onSelect={openSection}
                    onClose={() => setAccountMenuOpen(null)}
                    onLogout={handleLogout}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile top bar - brand, bell and language. */}
      <div className="md:hidden sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo size="sm" href={mode === 'operator' ? '/dashboard' : '/'} />
          <div className="flex items-center gap-1">
            {!loading && user && <NotificationBell size="sm" />}
            {!loading && user?.account_type === 'operator' && (
              <button
                onClick={() => {
                  const nextMode = mode === 'operator' ? 'traveler' : 'operator';
                  setMode(nextMode);
                  router.push(nextMode === 'operator' ? '/dashboard' : '/');
                }}
                aria-label={t(mode === 'operator' ? 'nav.traveler' : 'nav.operator')}
                title={t(mode === 'operator' ? 'nav.traveler' : 'nav.operator')}
                className="inline-flex items-center gap-1 rounded-lg px-2 h-8 text-[11px] font-semibold text-primary hover:bg-primary/5"
              >
                <ArrowLeftRight size={14} />
                {t(mode === 'operator' ? 'nav.traveler' : 'nav.operator')}
              </button>
            )}
            <LanguageMenu compact />
            {!loading && !user && (
              <Link
                href="/login"
                className="ml-1 inline-flex items-center h-8 px-3 rounded-lg border border-primary text-primary text-xs font-semibold"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
        <div className="px-4 pb-2">
          <Link
            href="/know-before-you-go"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-xs font-semibold shadow-sm transition-colors ${
              isActive('/know-before-you-go')
                ? 'bg-primary-hover text-primary-foreground ring-2 ring-primary/20'
                : 'bg-primary text-primary-foreground hover:bg-primary-hover'
            }`}
          >
            <FileText size={14} />
            {t('tourDetail.knowBeforeYouGo')}
          </Link>
        </div>
      </div>

      {/* Mobile bottom tab bar. */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden bg-card/95 backdrop-blur border-t border-border z-50">
        <div className="flex">
          {mobileTabs.map(({ href, labelKey, Icon }) => {
            const active = href === '/' ? pathname === '/' : isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{t(labelKey)}</span>
              </Link>
            );
          })}
          {!loading && user ? (
            <div className="flex-1 relative">
              <button
                onClick={() => setAccountMenuOpen((v) => (v === 'mobile' ? null : 'mobile'))}
                className="w-full flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {user.photo_url ? (
                  <img src={photoSrc(user.photo_url) ?? ''} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
                <span className="text-[10px] font-medium">{t('ui.nav.profile')}</span>
              </button>
              {accountMenuOpen === 'mobile' && (
                <AccountMenu
                  anchor="above"
                  showTravelerItems={mode !== 'operator'}
                  onSelect={openSection}
                  onClose={() => setAccountMenuOpen(null)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                pathname === '/login' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={20} />
              <span className="text-[10px] font-medium">{t('ui.nav.profile')}</span>
            </Link>
          )}
        </div>
      </nav>

      {activeSection && <AccountDetailModal section={activeSection} onClose={() => setActiveSection(null)} />}
    </>
  );
}
