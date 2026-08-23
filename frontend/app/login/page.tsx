'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, TrendingDown, Calendar, Ticket, User, LogOut,
  LayoutDashboard, PlusCircle, ClipboardList, Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TRAVELER_ITEMS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/compare', label: 'Compare', Icon: TrendingDown },
  { href: '/planner', label: 'Planner', Icon: Calendar },
  { href: '/bookings', label: 'Bookings', Icon: Ticket },
];

// Task 20 territory — these routes don't exist yet, so they'll 404 until
// the operator dashboard is built. Paths are settled now so Task 20 can
// build straight into them.
const OPERATOR_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/new-tour', label: 'Add Tour', Icon: PlusCircle },
  { href: '/dashboard/bookings', label: 'Bookings', Icon: ClipboardList },
  { href: '/dashboard/profile', label: 'Profile', Icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, operatorProfile, mode, setMode } = useAuth();

  const navItems = mode === 'operator' ? OPERATOR_ITEMS : TRAVELER_ITEMS;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-card h-screen sticky top-0">
        <div className="px-4 py-5 border-b border-border">
          <h2
            className="text-xl font-bold text-primary"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            TurPoint
          </h2>
          <p className="text-[10px] text-muted-foreground tracking-wide mt-0.5">
            Azərbaycan Tur Marketplace
          </p>
        </div>

        {!loading && operatorProfile && (
          <div className="px-3 pt-3">
            <div className="flex bg-muted rounded-full p-1">
              <button
                onClick={() => setMode('traveler')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-all ${
                  mode === 'traveler' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Traveler
              </button>
              <button
                onClick={() => setMode('operator')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-all ${
                  mode === 'operator' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Operator
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Account footer */}
        <div className="px-2 py-3 border-t border-border">
          {!loading && user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <LogOut size={10} /> Log out
                </button>
              </div>
            </div>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <User size={16} /> Log in
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav — mirrors whatever mode is set on desktop /
          the account page; no room for the pill switcher itself here. */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex">
          {navItems.map(({ href, label, Icon }) => {
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
                <span className="text-[9px] font-semibold">{label}</span>
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
            <span className="text-[9px] font-semibold">{!loading && user ? 'Account' : 'Log in'}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
