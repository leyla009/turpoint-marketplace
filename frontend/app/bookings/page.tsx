'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, XCircle, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useAuth, useRequireAuth } from '../context/AuthContext';
import PageContainer from '../components/PageContainer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_STYLE: Record<string, { Icon: any; className: string; label: string }> = {
  pending: { Icon: Clock, className: 'text-primary bg-primary/10', label: 'Pending' },
  confirmed: { Icon: CheckCircle2, className: 'text-accent bg-accent/10', label: 'Confirmed' },
  cancelled: { Icon: XCircle, className: 'text-muted-foreground bg-muted', label: 'Cancelled' },
};

export default function MyBookingsPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    setError(false);
    fetch(`${API_URL}/api/bookings/my-trips`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('request failed');
        return r.json();
      })
      .then(setBookings)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <PageContainer maxWidth="max-w-2xl">
      <h1 className="font-display text-xl font-bold text-foreground mb-1">My Bookings</h1>
      <p className="text-sm text-muted-foreground mb-5">Your tours, past and upcoming.</p>

      {error ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <AlertCircle size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t load your bookings. Is the backend running?</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">You haven't booked a tour yet.</p>
          <button onClick={() => router.push('/')} className="text-sm text-primary font-semibold">
            Browse tours →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => {
            const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.confirmed;
            const StatusIcon = style.Icon;
            return (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block bg-card border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{b.tour_title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin size={11} /> {b.tour_location}
                      <span className="mx-1">·</span>
                      <Calendar size={11} /> {b.tour_date}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${style.className}`}
                  >
                    <StatusIcon size={10} /> {style.label}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs">
                  <span className="font-mono text-muted-foreground">{b.ticket_code}</span>
                  <span className="text-muted-foreground">
                    {b.seats} seat{b.seats !== 1 ? 's' : ''} ·{' '}
                    <span className="font-semibold text-foreground">AZN{b.total_price}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}