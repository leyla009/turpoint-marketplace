'use client';

import { TrendingDown } from 'lucide-react';

export default function ComparePage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-20">
      <TrendingDown size={32} className="text-muted-foreground mb-3" />
      <h1 className="text-lg font-semibold text-foreground mb-1">Compare tours</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Side-by-side comparison is coming in a later sprint. The backend endpoint
        (/api/tours/compare) is already live and tested.
      </p>
    </div>
  );
}
