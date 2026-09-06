import type { MetadataRoute } from 'next';

// Account/booking/dashboard pages are all behind auth and have nothing for
// a crawler to index - only the public browse/tour pages are worth
// listing. Sitemap URL only resolves once NEXT_PUBLIC_SITE_URL is set (see
// sitemap.ts), same reasoning as metadataBase in layout.tsx.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/bookings', '/login', '/become-operator'],
      },
    ],
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
