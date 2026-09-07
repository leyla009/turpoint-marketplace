'use client';

import { useRequireAuth } from '@/app/context/AuthContext';
import OperatorPanelContent from '@/app/components/OperatorPanelContent';

// Standalone route so the panel is still reachable via direct link,
// bookmark, or refresh. From the nav, "Panel" instead opens this same
// content inside OperatorPanelModal as a floating popup over whatever
// page you're on - see components/OperatorPanelContent.tsx.
export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-3xl mx-auto pb-20 md:pb-6">
      <OperatorPanelContent authLoading={authLoading} />
    </div>
  );
}
