'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_STYLE: Record<string, { Icon: any; className: string; labelKey: 'status.pending' | 'status.confirmed' | 'status.cancelled' }> = {
  pending: { Icon: Clock, className: 'text-primary bg-primary/10', labelKey: 'status.pending' },
  confirmed: { Icon: CheckCircle2, className: 'text-accent bg-accent/10', labelKey: 'status.confirmed' },
  cancelled: { Icon: XCircle, className: 'text-muted-foreground bg-muted', labelKey: 'status.cancelled' },
};

export default function OperatorBookingsPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile } = useAuth();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!operatorProfile || !token) {
      setLoading(false);
      return;
    }
    setError(false);
    fetch(`${API_URL}/api/bookings/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('request failed');
        return r.json();
      })
      .then(setBookings)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [operatorProfile, token]);

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  if (!operatorProfile) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {t('operatorBookings.needProfile')}{' '}
        <a href="/dashboard/profile" className="text-primary font-semibold">
          {t('operatorBookings.createOne')}
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
        <ChevronLeft size={16} /> {t('operatorBookings.backToDashboard')}
      </button>

      <h1 className="font-display text-xl font-bold text-foreground mb-1">{t('operatorBookings.title')}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t('operatorBookings.subtitle')}</p>

      {error ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <AlertCircle size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('operatorBookings.couldntLoad')}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          {t('operatorBookings.noBookingsYet')}
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
                    <StatusIcon size={10} /> {t(style.labelKey)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground">
                    {t('myBookings.seatsCount', { count: b.seats })} · {b.ticket_code}
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
