'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Shared horizontal-browse behavior for card rows (popular destinations,
// last-minute deals, ...) - native touch/trackpad scroll on every device,
// plus desktop-only arrow buttons that fade in on hover once there's
// somewhere to scroll to. One implementation so every such row scrolls,
// snaps, and hides its scrollbar the same way instead of each section
// reinventing it slightly differently.
export default function HorizontalScroller({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const resizeObserver = new ResizeObserver(updateArrows);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="relative group/scroller">
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide -mx-1 px-1 snap-x snap-mandatory scroll-smooth"
      >
        {children}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label={t('common.scrollLeft')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 items-center justify-center rounded-full bg-card border border-border shadow-md text-foreground opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:border-primary/40 z-10"
        >
          <ChevronLeft size={17} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label={t('common.scrollRight')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 items-center justify-center rounded-full bg-card border border-border shadow-md text-foreground opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:border-primary/40 z-10"
        >
          <ChevronRight size={17} />
        </button>
      )}
    </div>
  );
}
