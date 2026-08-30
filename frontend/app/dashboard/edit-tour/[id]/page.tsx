'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];

export default function EditTourPage() {
  const router = useRouter();
  const { id } = useParams();
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile } = useAuth();
  const { showToast } = useToast();

  const [loadingTour, setLoadingTour] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notOwner, setNotOwner] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('nature');
  const [route, setRoute] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [durationDays, setDurationDays] = useState('1');
  const [minParticipants, setMinParticipants] = useState('3');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !operatorProfile) return;
    setLoadingTour(true);
    fetch(`${API_URL}/api/tours/${id}`)
      .then((r) => r.json())
      .then((tour) => {
        if (!tour?.id) {
          setLoadError('Tour not found.');
          return;
        }
        if (tour.operator_id !== operatorProfile.id) {
          setNotOwner(true);
          return;
        }
        setTitle(tour.title ?? '');
        setDescription(tour.description ?? '');
        setLocation(tour.location ?? '');
        setCategory(tour.category ?? 'nature');
        setRoute(tour.route ?? '');
        setPrice(String(tour.price ?? ''));
        setDate(tour.date ?? '');
        setDurationDays(String(tour.duration_days ?? 1));
        setMinParticipants(String(tour.min_participants ?? 3));
        setMaxParticipants(String(tour.max_participants ?? 10));
      })
      .catch(() => setLoadError("Couldn't reach the backend. Is it running?"))
      .finally(() => setLoadingTour(false));
  }, [id, operatorProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title || !price || !date) {
      setError('Title, price, and date are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/tours/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description,
          location,
          category,
          route,
          price: Number(price),
          date,
          duration_days: Number(durationDays),
          min_participants: Number(minParticipants),
          max_participants: Number(maxParticipants),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      showToast('Tour updated.');
      router.push('/dashboard');
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loadingTour) {
    return (
      <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Loading...
      </div>
    );
  }

  if (loadError) {
    return <div className="p-6 text-sm text-muted-foreground">{loadError}</div>;
  }

  if (notOwner) {
    return <div className="p-6 text-sm text-muted-foreground">You can only edit your own tours.</div>;
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-lg mx-auto pb-20 md:pb-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> Back to dashboard
      </button>

      <h1 className="font-display text-xl font-bold text-foreground mb-1">Edit tour</h1>
      <p className="text-sm text-muted-foreground mb-5">Changes go live immediately.</p>

      <form onSubmit={handleSubmit} className="space-y-3 bg-card border border-border rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Route / itinerary</label>
          <input
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Price per person (AZN)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Days</label>
            <input
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Min group</label>
            <input
              type="number"
              min="1"
              value={minParticipants}
              onChange={(e) => setMinParticipants(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Max group</label>
            <input
              type="number"
              min="1"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
