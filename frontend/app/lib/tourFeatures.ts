import { Sunrise, Moon, UserCheck, Gamepad2, BedDouble, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from './translations';

// Single source of truth for the tour "inclusion" tags - shared by the
// homepage's filter chips and the operator tour create/edit forms, so the
// slug <-> label mapping can never drift between the two. labelKey looks
// up the actual display text in translations.ts, so these render in
// whichever of az/en/ru the user has picked. Slugs are stored on
// tours.features as a comma-separated string (backend/src/db/schema.sql),
// matching the same convention already used for operators.vehicle_features.
export interface TourFeature {
  slug: string;
  labelKey: TranslationKey;
  Icon: LucideIcon;
}

export const TOUR_FEATURES: TourFeature[] = [
  { slug: 'breakfast', labelKey: 'feature.breakfast', Icon: Sunrise },
  { slug: 'evening_tea', labelKey: 'feature.eveningTea', Icon: Moon },
  { slug: 'guide', labelKey: 'feature.guide', Icon: UserCheck },
  { slug: 'road_games', labelKey: 'feature.roadGames', Icon: Gamepad2 },
  { slug: 'hotel_stay', labelKey: 'feature.hotelStay', Icon: BedDouble },
];

export function parseFeatures(features: string | null | undefined): string[] {
  return features ? features.split(',').filter(Boolean) : [];
}
