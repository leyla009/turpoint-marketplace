import type { ReactNode } from 'react';
import { AuthHeader, AuthFooter } from '../components/AuthChrome';

// Dedicated chrome for authentication pages - no main site Nav, no full
// site Footer (see AuthChrome.tsx). This is a real route-group layout, not
// Nav/Footer hiding themselves via a pathname check, so a (main) page can
// never accidentally lose its chrome and an (auth) page can never
// accidentally gain the marketing footer.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      <div className="flex-1 flex flex-col">{children}</div>
      <AuthFooter />
    </div>
  );
}
