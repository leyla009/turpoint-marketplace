'use client';

import { Calendar } from 'lucide-react';

export default function PlannerPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-20">
      <Calendar size={32} className="text-muted-foreground mb-3" />
      <h1 className="text-lg font-semibold text-foreground mb-1">Smart Planner</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Budget and day-based trip planning is coming in a later sprint. The backend
        endpoint (/api/planner) is already live and tested.
      </p>
    </div>
  );
}
