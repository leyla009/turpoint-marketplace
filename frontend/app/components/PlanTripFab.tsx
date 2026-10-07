'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Pages where a "Plan my trip" shortcut doesn't belong: the planner itself,
// mid-checkout, operator tools, and account settings (whose sticky save bar
// sits in the same corner).
const HIDDEN_ON = [/^\/planner/, /^\/tours\/[^/]+\/book/, /^\/dashboard/, /^\/become-operator/, /^\/account/];

// The tour page has its own fixed booking bar along the bottom below lg.
const LG_ONLY_ON = [/^\/tours\/[^/]+$/];

// Floating "Plan my trip" shortcut on every traveller page (desktop/tablet -
// phones have Planner in the bottom tab bar). On the homepage it waits until
// the visitor scrolls past the hero search. Over the navy footer it switches
// to a light style so it never blends into it.
export default function PlanTripFab() {
  const pathname = usePathname();
  const { mode } = useAuth();
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  // Pages with their own bottom tray (Explore's compare bar) ask it to step aside.
  const [yielded, setYielded] = useState(false);
  useEffect(() => {
    const onYield = (e: Event) => setYielded(Boolean((e as CustomEvent).detail));
    window.addEventListener('turpoint:fab-hidden', onYield);
    return () => window.removeEventListener('turpoint:fab-hidden', onYield);
  }, []);

  const hidden = mode === 'operator' || HIDDEN_ON.some((re) => re.test(pathname));

  useEffect(() => {
    if (hidden) return;
    const onScroll = () => {
      setScrolled(pathname !== '/' || window.scrollY > 400);
      // Within the footer's last row (copyright, legal links, language
      // switcher): lift the button above it so it never covers those links.
      setAtEnd(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 72);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // The button sits 24px above the bottom edge and is ~48px tall, so the
    // footer "reaches" it once its top passes ~72px above the bottom.
    const observers: IntersectionObserver[] = [];
    const footer = document.querySelector('footer');
    if (footer) {
      const o = new IntersectionObserver(([e]) => setOverFooter(e.isIntersecting), { rootMargin: '0px 0px -24px 0px' });
      o.observe(footer);
      observers.push(o);
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      observers.forEach((o) => o.disconnect());
    };
    // pathname: re-find the footer after navigation.
  }, [hidden, pathname]);

  if (hidden) return null;
  const show = scrolled && !yielded;
  const display = LG_ONLY_ON.some((re) => re.test(pathname)) ? 'hidden lg:inline-flex' : 'hidden md:inline-flex';

  return (
    <Link
      href="/planner"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      className={`${display} fixed right-6 z-40 ${atEnd ? 'bottom-24' : 'bottom-6'} items-center gap-2 text-sm font-semibold pl-4 pr-5 py-3 rounded-full shadow-lift transition-all duration-300 ${
        overFooter ? 'bg-[#A8E3EC] text-navy hover:bg-[#C3EDF3]' : 'bg-navy text-white hover:bg-navy/90'
      } ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <Sparkles size={16} /> {t('ui.why.pSubmit')}
    </Link>
  );
}
