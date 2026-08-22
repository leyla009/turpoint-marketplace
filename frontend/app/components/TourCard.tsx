'use client';

import { Leaf, Landmark, Music, Utensils, MapPin, Users, Zap } from 'lucide-react';

export const CATEGORY_STYLE: Record<string, { gradient: string; Icon: any; label: string }> = {
  nature: { gradient: 'from-emerald-400 to-emerald-600', Icon: Leaf, label: 'Nature' },
  history: { gradient: 'from-amber-400 to-amber-700', Icon: Landmark, label: 'History' },
  entertainment: { gradient: 'from-violet-400 to-violet-600', Icon: Music, label: 'Entertainment' },
  food: { gradient: 'from-orange-400 to-red-500', Icon: Utensils, label: 'Food' },
};

export interface ApiTour {
  id: number;
  operator_id: number;
  title: string;
  location: string | null;
  category: string | null;
  price: number;
  date: string;
  duration_days: number;
  min_participants: number;
  max_participants: number;
  discounted_price?: number;
}

export default function TourCard({
  tour,
  operatorName,
  onClick,
}: {
  tour: ApiTour;
  operatorName?: string;
  onClick: () => void;
}) {
  const style = CATEGORY_STYLE[tour.category ?? ''] ?? CATEGORY_STYLE.history;
  const Icon = style.Icon;
  const hasDeal = typeof tour.discounted_price === 'number';

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
    >
      <div className={`relative h-36 sm:h-40 bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
        <Icon size={40} className="text-white/70" />
        {hasDeal && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Zap size={9} /> Last-minute deal
          </span>
        )}
        <span className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
          {style.label}
        </span>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{tour.title}</h3>
        {tour.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mb-2.5">
            <MapPin size={11} /> {tour.location}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate text-foreground">{operatorName ?? 'TurPoint operator'}</p>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              <Users size={10} /> min {tour.min_participants} to confirm
            </p>
          </div>
          <div className="text-right shrink-0">
            {hasDeal ? (
              <>
                <p className="text-[10px] text-muted-foreground line-through">AZN{tour.price}</p>
                <p className="text-sm font-bold text-primary">
                  AZN{tour.discounted_price}
                  <span className="text-[10px] font-normal text-muted-foreground">/pp</span>
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-primary">
                AZN{tour.price}
                <span className="text-[10px] font-normal text-muted-foreground">/pp</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
