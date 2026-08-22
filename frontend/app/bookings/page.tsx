'use client';

import { Ticket } from 'lucide-react';

export default function BookingsPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-20">
      <Ticket size={32} className="text-muted-foreground mb-3" />
      <h1 className="text-lg font-semibold text-foreground mb-1">My bookings</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Your e-tickets will show up here once login is wired into the frontend. The
        backend endpoint (/api/bookings) is already live and tested.
      </p>
    </div>
  );
}
