'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Star, ListChecks, Ticket, ArrowRight, Trash2 } from 'lucide-react';
import { useAuth, useRequireAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile } = useAuth();

  const [myTours, setMyTours] = useState<any[]>([]);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);

  function loadTours() {
    if (!operatorProfile) return;
    fetch(`${API_URL}/api/tours`)
      .then((r) => r.json())
      .then((allTours) => setMyTours(allTours.filter((t: any) => t.operator_id === operatorProfile.id)));
  }

  useEffect(() => {
    if (!operatorProfile) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`${API_URL}/api/tours`).then((r) => r.json()),
      fetch(`${API_URL}/api/bookings/mine`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([allTours, bookings]) => {
        setMyTours(allTours.filter((t: any) => t.operator_id === operatorProfile.id));
        setBookingCount(bookings.length);
      })
      .finally(() => setLoading(false));
  }, [operatorProfile, token]);

  async function handleDelete(tourId: number, title: string, force = false) {
    if (!force && !window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleteError(null);
    setDeletingId(tourId);
    try {
      const res = await fetch(`${API_URL}/api/tours/${tourId}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 409 && data.booking_count && !force) {
        const proceed = window.confirm(`${data.error}\n\nDelete anyway?`);
        if (proceed) return handleDelete(tourId, title, true);
        return;
      }
      if (!res.ok) {
        setDeleteError({ id: tourId, message: data.error ?? 'Could not delete this tour.' });
        return;
      }
      loadTours();
    } catch {
      setDeleteError({ id: tourId, message: "Couldn't reach the backend." });
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!operatorProfile) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-20">
        <ListChecks size={32} className="text-muted-foreground mb-3" />
        <h1 className="text-lg font-semibold text-foreground mb-1">No operator profile yet</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-4">
          Create one to start listing tours and see bookings roll in.
        </p>
        <Link
          href="/dashboard/profile"
          className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl"
        >
          Become an operator
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-3xl mx-auto pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{operatorProfile.name}</h1>
          <p className="text-sm text-muted-foreground">Operator dashboard</p>
        </div>
        <Link
          href="/dashboard/new-tour"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl"
        >
          <PlusCircle size={15} /> Add tour
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{myTours.length}</p>
          <p className="text-[11px] text-muted-foreground">Active tours</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
            <Star size={16} className="text-primary" fill="currentColor" />
            {operatorProfile.rating ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground">Rating</p>
        </div>
        <Link href="/dashboard/bookings" className="bg-card border border-border rounded-xl p-3 text-center hover:border-primary/40">
          <p className="text-2xl font-bold text-foreground">{bookingCount ?? 0}</p>
          <p className="text-[11px] text-muted-foreground">Bookings</p>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground">Your tours</h2>
        <Link href="/dashboard/bookings" className="flex items-center gap-1 text-xs text-accent font-semibold">
          View bookings <ArrowRight size={12} />
        </Link>
      </div>

      {myTours.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <Ticket size={26} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">You haven't listed a tour yet.</p>
          <Link href="/dashboard/new-tour" className="text-sm text-primary font-semibold">
            Add your first tour →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {myTours.map((tour) => (
            <div key={tour.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{tour.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {tour.location} · {tour.date} · AZN{tour.price}/pp
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    min {tour.min_participants} · max {tour.max_participants}
                  </span>
                  <button
                    onClick={() => handleDelete(tour.id, tour.title)}
                    disabled={deletingId === tour.id}
                    title="Delete tour"
                    className="text-muted-foreground hover:text-red-600 disabled:opacity-40 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {deleteError?.id === tour.id && (
                <p className="text-[11px] text-red-600 mt-2 pt-2 border-t border-border">{deleteError.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}  