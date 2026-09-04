import { Snowflake, Wifi, Luggage, BatteryCharging, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from './translations';

// Vehicle/transport amenity tags - these map to the existing
// operators.vehicle_features column (backend/src/db/schema.sql), already
// set from the operator profile form as a comma-separated string like
// "wifi,ac,charging,luggage". Filtering by these on the homepage means
// filtering tours by their OWNING OPERATOR's vehicle, not by the tour
// itself - a tour matches if its operator's vehicle_features includes
// every selected slug.
export interface VehicleFeature {
  slug: string;
  labelKey: TranslationKey;
  Icon: LucideIcon;
}

export const VEHICLE_FEATURES: VehicleFeature[] = [
  { slug: 'ac', labelKey: 'vehicleFeature.ac', Icon: Snowflake },
  { slug: 'wifi', labelKey: 'vehicleFeature.wifi', Icon: Wifi },
  { slug: 'luggage', labelKey: 'vehicleFeature.luggage', Icon: Luggage },
  { slug: 'charging', labelKey: 'vehicleFeature.charging', Icon: BatteryCharging },
];

export function parseVehicleFeatures(vehicleFeatures: string | null | undefined): string[] {
  return vehicleFeatures ? vehicleFeatures.split(',').map((f) => f.trim()).filter(Boolean) : [];
}
