'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Users, Calendar } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function TourDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/tours/${id}`)
      .then((r) => r.json())
      .then(setTour)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> Back to tours
      </button>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!loading && !tour?.id && <p className="text-sm text-muted-foreground">Tour not found.</p>}

      {!loading && tour?.id && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h1
            className="text-2xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {tour.title}
          </h1>
          {tour.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin size={13} /> {tour.location}
            </p>
          )}
          {tour.description && <p className="text-sm text-foreground/80 mb-4">{tour.description}</p>}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Calendar size={13} /> {tour.date}
            </span>
            <span className="flex items-center gap-1">
              <Users size={13} /> min {tour.min_participants} / max {tour.max_participants}
            </span>
          </div>
          <p className="text-xl font-bold text-primary">
            AZN{tour.discounted_price ?? tour.price}
            <span className="text-xs font-normal text-muted-foreground"> per person</span>
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Full booking flow (seats, group formation, reviews) lands in a later sprint.
          </p>
        </div>
      )}
    </div>
  );
}
