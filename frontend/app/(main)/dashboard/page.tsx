'use client';

import { useRequireAuth } from '@/app/context/AuthContext';
import OperatorPanelContent from '@/app/components/OperatorPanelContent';

// The operator's one and only page - tours, stats, and profile editing
// (OperatorProfileForm) all live inside OperatorPanelContent below, rather
// than being split across separate /dashboard/bookings and
// /dashboard/profile routes like before.
export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();

  return (
    <div className="relative min-h-screen">
      {/* min-h-screen (not min-h-full) - the panel's own content is often
          short (a couple of tour rows, a form), and min-h-full just let it
          shrink to that height, which pulled the Footer up over the bottom
          third of the fixed background photo below. Forcing this page to
          be at least one full viewport tall pushes the footer below the
          fold instead, so the photo shows in full before you scroll to it. */}
      {/* Fixed (not scrolling) photo behind the whole panel, shown at its
          original color with no scrim - text/card colors get tuned
          separately to stay readable against it. */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/pictures/Operatorback.webp')" }}
      />

      <div className="relative p-4 sm:p-6 max-w-3xl mx-auto pb-20 md:pb-6">
        <OperatorPanelContent authLoading={authLoading} />
      </div>
    </div>
  );
}
