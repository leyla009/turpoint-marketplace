'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { ApiTour } from './TourCard';
import { useLanguage } from '../context/LanguageContext';

// Known coordinates for Azerbaijan's common tour destinations. Keyed by a
// normalized city name (lowercase, no country suffix) so it matches
// real tour.location values like "Baku, Azerbaijan" or "Sheki, Azerbaijan".
// Anything not in this list is simply skipped — no pin, no crash — so
// adding a new destination later is a one-line addition here.
const CITY_COORDS: Record<string, [number, number]> = {
  baku: [40.4093, 49.8671],
  goygol: [40.5667, 46.3167],
  qobustan: [40.1145, 49.4159],
  sheki: [41.1919, 47.1706],
  şəki: [41.1919, 47.1706],
  lahij: [40.8339, 48.3781],
  lahıc: [40.8339, 48.3781],
  quba: [41.3606, 48.5128],
  guba: [41.3606, 48.5128],
  gabala: [40.9975, 47.8422],
  qəbələ: [40.9975, 47.8422],
  lankaran: [38.7529, 48.8514],
  lənkəran: [38.7529, 48.8514],
  ganja: [40.6828, 46.3606],
  gəncə: [40.6828, 46.3606],
  shamakhi: [40.6297, 48.6367],
  ismayilli: [40.7844, 48.1522],
  nakhchivan: [39.2089, 45.4122],
};

function normalize(location: string): string {
  return location.split(',')[0].trim().toLowerCase();
}

export default function DestinationMap({
  tours,
  heightClassName = 'h-64 sm:h-80',
}: {
  tours: ApiTour[];
  heightClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const { locale, t } = useLanguage();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require('leaflet');

    const map = L.map(containerRef.current, {
      center: [40.4, 47.8],
      zoom: 7,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:var(--primary);transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 16],
      popupAnchor: [0, -18],
    });

    // Track how many pins have landed on the same city so duplicates
    // don't stack exactly on top of each other.
    const seenAtCity: Record<string, number> = {};
    let placed = 0;

    tours.forEach((tour) => {
      if (!tour.location) return;
      const key = normalize(tour.location);
      const coords = CITY_COORDS[key];
      if (!coords) {
        console.warn(`[DestinationMap] no coordinates for "${tour.location}" — skipped`);
        return;
      }

      const dupIndex = seenAtCity[key] ?? 0;
      seenAtCity[key] = dupIndex + 1;
      const jitter = dupIndex * 0.02;
      const [lat, lng] = [coords[0] + jitter, coords[1] + jitter];

      const price = tour.discounted_price ?? tour.price;
      const popupHtml = `
        <div style="font-family: 'Nunito', sans-serif; min-width: 160px;">
          <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#1F2A24;">${tour.title}</p>
          <p style="font-size:11px;color:#7A7266;margin:0 0 6px;">${tour.location}</p>
          <p style="font-weight:700;font-size:13px;color:#1B3D2F;margin:0 0 6px;">AZN${price}<span style="font-weight:400;font-size:10px;color:#7A7266;">/pp</span></p>
          <a href="/tours/${tour.id}" style="font-size:11px;font-weight:700;color:#C95E18;text-decoration:none;">${t('map.viewTour')}</a>
        </div>`;

      L.marker([lat, lng], { icon: pinIcon }).addTo(map).bindPopup(popupHtml);
      placed += 1;
    });

    if (placed === 0) {
      map.setView([40.4, 47.8], 6);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [tours, locale]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClassName} rounded-xl overflow-hidden border border-border`}
    />
  );
}
