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
    const res = await fetch(`${API_URL}/api/tours/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const tour = await res.json();
    if (!tour?.title) return {};

    const description = tour.description
      ? String(tour.description).slice(0, 155)
      : `${tour.title}${tour.location ? ` — ${tour.location}` : ''}, Azərbaycanda tur. TurPoint ilə bron edin.`;

    return {
      title: tour.title,
      description,
      openGraph: { title: tour.title, description },
    };
  } catch {
    return {};
  }
}

export default function TourLayout({ children }: { children: ReactNode }) {
  return children;
}
