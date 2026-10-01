import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Server-side metadata for one tour's page. The tour detail UI itself
// (./page.tsx) has to be a client component - it's all useState/useEffect
// driven (reviews, live group-formation status, auth-gated actions) - and
// a client component can't also export generateMetadata, so this sibling
// layout carries the per-tour <title>/description instead. Falls back to
// the generic site title if the tour can't be fetched (e.g. deleted tour,
// backend briefly down) rather than failing the page.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;
  try {
    // x-no-view-count: this is Next fetching metadata, not a visitor viewing the tour.
    const res = await fetch(`${API_URL}/api/tours/${id}`, { next: { revalidate: 60 }, headers: { 'x-no-view-count': '1' } });
    if (!res.ok) return {};
    const tour = await res.json();
    if (!tour?.title) return {};

    // Metadata is rendered on the server, which doesn't know the visitor's
    // chosen language (it lives in localStorage), so use the site's default,
    // Azerbaijani, when the tour has a translation - else the plain text.
    const parse = (v: unknown): Record<string, string> | null => {
      if (!v) return null;
      if (typeof v === 'object') return v as Record<string, string>;
      try { return JSON.parse(String(v)); } catch { return null; }
    };
    const title: string = parse(tour.title_i18n)?.az || tour.title;
    const summary: string | undefined = parse(tour.description_i18n)?.az || tour.description || undefined;

    const description = summary
      ? String(summary).slice(0, 155)
      : `${title}${tour.location ? ` — ${tour.location}` : ''}, Azərbaycanda tur. TurPoint ilə bron edin.`;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return {};
  }
}

export default function TourLayout({ children }: { children: ReactNode }) {
  return children;
}
