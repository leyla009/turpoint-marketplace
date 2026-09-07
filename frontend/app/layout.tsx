import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';

// NEXT_PUBLIC_SITE_URL is optional - only set it once this deploys to a
// real domain. Left unset, metadataBase is simply omitted rather than
// fabricating a placeholder domain into Open Graph/canonical tags.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: 'TurPoint — Azərbaycanı kəşf et',
    template: '%s | TurPoint',
  },
  description:
    'Azərbaycanda real tur operatorlarının turlarını tapın, müqayisə edin və qrup qiyməti ilə bron edin — Quba, Şəki, Qəbələ, Lənkəran və daha çox istiqamət.',
  keywords: ['Azərbaycan turları', 'Azerbaijan tours', 'tur bron etmək', 'Quba', 'Şəki', 'Qəbələ', 'Lənkəran'],
  openGraph: {
    type: 'website',
    locale: 'az_AZ',
    siteName: 'TurPoint',
    title: 'TurPoint — Azərbaycanı kəşf et',
    description: 'Azərbaycanda real tur operatorlarının turlarını tapın, müqayisə edin və qrup qiyməti ilə bron edin.',
  },
};

// Deliberately just the providers + document shell here - Nav/Footer live
// in (main)/layout.tsx instead of here, so a route group like (auth) can
// opt out of the full site chrome without a pathname check hiding it at
// runtime. See (main)/layout.tsx and (auth)/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="az">
      <body className="bg-background text-foreground">
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
