import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Nav from './components/Nav';
import { AuthProvider } from './context/AuthContext';

export const metadata: Metadata = {
  title: 'TurPoint',
  description: 'Azərbaycanda tur operatorları və bələdçilər üçün marketplace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="az">
      <body className="bg-background text-foreground">
        <AuthProvider>
          <div className="flex min-h-screen">
            <Nav />
            <div className="flex-1 pb-16 md:pb-0 min-w-0">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}   