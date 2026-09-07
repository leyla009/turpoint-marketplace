import type { ReactNode } from 'react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

// Every "normal" page (browse, tour detail, booking, dashboard, ...) lives
// under this route group and gets the full site chrome. (auth) is the
// sibling group that deliberately doesn't import this layout at all.
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="flex-1 pb-16 md:pb-0 min-w-0">{children}</div>
      <Footer />
    </div>
  );
}
