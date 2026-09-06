import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Real tour ids only, fetched from the live API at request time - never a
// hardcoded id list that would drift out of date the moment a tour is
// added, edited, or removed. Falls back to just the homepage if the
// backend can't be reached, rather than failing the whole sitemap.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const entries: MetadataRoute.Sitemap = [{ url: siteUrl, changeFrequency: 'daily', priority: 1 }];

  try {
    const res = await fetch(`${API_URL}/api/tours`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const tours = await res.json();
      if (Array.isArray(tours)) {
        for (const tour of tours) {
          entries.push({
            url: `${siteUrl}/tours/${tour.id}`,
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }
    }
  } catch {
    // Backend unreachable at build/request time - ship the homepage-only
    // sitemap rather than failing the route.
  }

  return entries;
}
