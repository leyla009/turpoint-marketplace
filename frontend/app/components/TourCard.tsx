'use client';

import { MapPin, Zap } from 'lucide-react';

type IconProps = { size?: number; className?: string };

// Custom category glyphs — distinctive, single-purpose icons rather than
// generic stock ones. Shared between the homepage category chips and every
// tour card badge so the same shape always means the same category.
function MountainIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 19h18L14.5 7l-3.5 6-2-2.5L3 19Z" />
      <circle cx="17.5" cy="6" r="1.4" />
    </svg>
  );
}

function ObeliskIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20h16" />
      <path d="M10 20V9l2-4 2 4v11" />
    </svg>
  );
}

function SparkleIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3c.3 2.6.9 4 2 5s2.4 1.7 5 2c-2.6.3-4 .9-5 2s-1.7 2.4-2 5c-.3-2.6-.9-4-2-5s-2.4-1.7-5-2c2.6-.3 4-.9 5-2s1.7-2.4 2-5Z" />
    </svg>
  );
}

function DiningBowlIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12h18a9 9 0 0 1-9 9 9 9 0 0 1-9-9Z" />
      <path d="M3 12a9 9 0 0 1 3.4-7" />
      <path d="M9.5 3.5c0 1.3-1.3 1.3-1.3 2.6" />
      <path d="M13.5 3.5c0 1.3-1.3 1.3-1.3 2.6" />
    </svg>
  );
}

// `gradient` is kept for the tour detail hero image and the compare page,
// which still use a full-bleed gradient block; `tint`/`iconColor` are for
// the icon badge used on TourCard itself.
export const CATEGORY_STYLE: Record<
  string,
  { gradient: string; tint: string; iconColor: string; label: string; Icon: any }
> = {
  nature: {
    gradient: 'from-emerald-400 to-emerald-600',
    tint: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    Icon: MountainIcon,
    label: 'Nature',
  },
  history: {
    gradient: 'from-amber-400 to-amber-700',
    tint: 'bg-amber-50',
    iconColor: 'text-amber-700',
    Icon: ObeliskIcon,
    label: 'History',
  },
  entertainment: {
    gradient: 'from-violet-400 to-violet-600',
    tint: 'bg-violet-50',
    iconColor: 'text-violet-600',
    Icon: SparkleIcon,
    label: 'Entertainment',
  },
  food: {
    gradient: 'from-orange-400 to-red-500',
    tint: 'bg-red-50',
    iconColor: 'text-red-600',
    Icon: DiningBowlIcon,
    label: 'Food',
  },
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
      className="relative bg-card rounded-2xl border border-border p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-accent/30"
    >
      {hasDeal && (
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-accent text-accent-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">
          <Zap size={8} /> Deal
        </span>
      )}

      <div className="flex items-center gap-2.5 mb-3.5">
        <div className={`w-10 h-10 rounded-[10px] ${style.tint} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={style.iconColor} />
        </div>
        <span className={`text-[10px] font-bold ${style.iconColor} ${style.tint} px-2.5 py-1 rounded-full`}>
          {style.label}
        </span>
      </div>

      <h3 className="text-sm font-extrabold text-foreground leading-snug mb-1">{tour.title}</h3>
      {tour.location && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground mb-3.5">
          <MapPin size={11} /> {tour.location}
        </p>
      )}

      <div className="h-px bg-border/70 mb-3" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground truncate">
          {operatorName ?? 'TurPoint operator'}
        </span>
        {hasDeal ? (
          <span className="text-sm font-extrabold text-primary shrink-0">
            AZN{tour.discounted_price}
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground line-through">
              AZN{tour.price}
            </span>
          </span>
        ) : (
          <span className="text-sm font-extrabold text-primary shrink-0">AZN{tour.price}</span>
        )}
      </div>
    </div>
  );
}
