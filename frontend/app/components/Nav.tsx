'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingDown, Calendar, Ticket } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/compare', label: 'Compare', Icon: TrendingDown },
  { href: '/planner', label: 'Planner', Icon: Calendar },
  { href: '/bookings', label: 'Bookings', Icon: Ticket },
];

export default function Nav() {
  const pathname = usePathname();

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
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
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
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
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
        </div>
      </nav>
    </>
  );
}
