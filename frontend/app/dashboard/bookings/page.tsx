'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_STYLE: Record<string, { Icon: any; className: string; label: string }> = {
  pending: { Icon: Clock, className: 'text-primary bg-primary/10', label: 'Pending' },
  confirmed: { Icon: CheckCircle2, className: 'text-accent bg-accent/10', label: 'Confirmed' },
  cancelled: { Icon: XCircle, className: 'text-muted-foreground bg-muted', label: 'Cancelled' },
};

export default function OperatorBookingsPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!operatorProfile || !token) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/bookings/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [operatorProfile, token]);

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!operatorProfile) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        You need an operator profile to see bookings.{' '}
        <a href="/dashboard/profile" className="text-primary font-semibold">
          Create one →
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-2xl mx-auto pb-20 md:pb-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> Back to dashboard
      </button>

      <h1 className="font-display text-xl font-bold text-foreground mb-1">Bookings</h1>
      <p className="text-sm text-muted-foreground mb-5">Across all of your tours, most recent first.</p>

      {bookings.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          No bookings yet.
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => {
            const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.confirmed;
            const StatusIcon = style.Icon;
            return (
              <div key={b.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{b.tour_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.traveler_name} · {b.traveler_email}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${style.className}`}
                  >
                    <StatusIcon size={10} /> {style.label}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground">
                    {b.seats} seat{b.seats !== 1 ? 's' : ''} · {b.ticket_code}
                  </span>
                  <span className="font-semibold text-foreground">AZN{b.total_price}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
