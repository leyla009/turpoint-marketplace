import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="az">
      <body className="bg-background text-foreground">
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <div className="min-h-screen flex flex-col">
                <Nav />
                <div className="flex-1 pb-16 md:pb-0 min-w-0">{children}</div>
                <Footer />
              </div>
            </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}   