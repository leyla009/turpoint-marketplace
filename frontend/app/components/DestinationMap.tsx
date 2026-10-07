'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'leaflet/dist/leaflet.css';
import { Maximize2, X } from 'lucide-react';
import type { ApiTour } from './TourCard';
import { useLanguage } from '../context/LanguageContext';
import type { Locale } from '../lib/translations';
import { tourTitle, placeName } from '../lib/tourContent';
import { GOOGLE_MAPS_MAP_ID, googleMapsEnabled, loadGoogleMaps, onGoogleMapsAuthFailure } from '../lib/googleMaps';

// Known coordinates for Azerbaijan's common tour destinations. Keyed by a
// normalized city name (lowercase, no country suffix) so it matches
// real tour.location values like "Baku, Azerbaijan" or "Sheki, Azerbaijan".
// Anything not in this list is simply skipped — no pin, no crash — so
// adding a new destination later is a one-line addition here.
const CITY_COORDS: Record<string, [number, number]> = {
  baku: [40.4093, 49.8671],
  bakı: [40.4093, 49.8671],
  şamaxı: [40.6297, 48.6367],
  ismayıllı: [40.7844, 48.1522],
  'i̇smayıllı': [40.7844, 48.1522],
  şirvan: [39.9379, 48.9206],
  xankəndi: [39.8153, 46.7519],
  goygol: [40.5667, 46.3167],
  qobustan: [40.1145, 49.4159],
  xızı: [40.9108, 49.0711],
  khizi: [40.9108, 49.0711],
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

// One pin per tour that has known coordinates, with its popup HTML. Shared
// by both map providers so markers and popups never drift apart.
interface Pin {
  lat: number;
  lng: number;
  html: string;
}

function pinsFor(tours: ApiTour[], viewTourLabel: string, locale: Locale): Pin[] {
  // Track how many pins have landed on the same city so duplicates don't
  // stack exactly on top of each other.
  const seenAtCity: Record<string, number> = {};
  const pins: Pin[] = [];
  const esc = (v: unknown) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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

    const price = tour.discounted_price ?? tour.price;
    pins.push({
      lat: coords[0] + jitter,
      lng: coords[1] + jitter,
      html: `
      <div style="font-family: 'Nunito', sans-serif; min-width: 160px;">
        <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#13293D;">${esc(tourTitle(tour, locale))}</p>
        <p style="font-size:11px;color:#64748B;margin:0 0 6px;">${esc(placeName(tour.location, locale))}</p>
        <p style="font-weight:700;font-size:13px;color:#0B8AA3;margin:0 0 6px;">₼${esc(price)}<span style="font-weight:400;font-size:10px;color:#64748B;">/pp</span></p>
        <a href="/tours/${tour.id}" style="font-size:11px;font-weight:700;color:#0B8AA3;text-decoration:none;">${esc(viewTourLabel)}</a>
      </div>`,
    });
  });
  return pins;
}

// Fixed center/zoom (not fitBounds) - a deliberately hand-picked framing of
// mainland Azerbaijan that always renders the same way regardless of
// container size or how many tours have coordinates.
const CENTER = { lat: 40.4, lng: 47.8 };
const PIN_STYLE =
  'width:16px;height:16px;border-radius:50% 50% 50% 0;background:var(--primary);transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);';

// What both providers hand back to the component.
interface MapHandle {
  destroy: () => void;
  resize: () => void;
}

// scrollWheelZoom is the only behavior difference between the small embed
// and the expanded modal: off on the embed (so scrolling the page over it
// doesn't accidentally zoom the map), on in the modal (the whole point of
// expanding it is to be able to zoom with the touchpad).
function createLeafletMap(container: HTMLDivElement, pins: Pin[], scrollWheelZoom: boolean): MapHandle {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const L = require('leaflet');

  const map = L.map(container, { center: [CENTER.lat, CENTER.lng], zoom: pins.length ? 7 : 6, scrollWheelZoom });

  // Esri's neutral "Light Gray Canvas" instead of stock OSM - CARTO's free
  // anonymous tiles (tried first) now require a signed-up API key and just
  // render a "API key required" watermark without one. This one needs no
  // key, and its muted grays/whites blend into the site's warm cream
  // background instead of fighting it with saturated pink/yellow roads.
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors',
    maxZoom: 16,
  }).addTo(map);

  const pinIcon = L.divIcon({
    className: '',
    html: `<div style="${PIN_STYLE}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
    popupAnchor: [0, -18],
  });
  pins.forEach((p) => L.marker([p.lat, p.lng], { icon: pinIcon }).addTo(map).bindPopup(p.html));

  return { destroy: () => map.remove(), resize: () => map.invalidateSize() };
}

// Google Maps version of the same map. Loading is async, so the handle is
// returned at once and the map fills in when the API is ready; `onFail`
// switches the component back to Leaflet if the script can't load.
function createGoogleMap(
  container: HTMLDivElement,
  pins: Pin[],
  scrollWheelZoom: boolean,
  language: string,
  onFail: () => void
): MapHandle {
  let destroyed = false;
  const markers: any[] = [];
  let infoWindow: any = null;

  (async () => {
    try {
      const maps = await loadGoogleMaps(language);
      const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
        maps.importLibrary('maps'),
        maps.importLibrary('marker'),
      ]);
      if (destroyed) return;

      const map = new Map(container, {
        center: CENTER,
        zoom: pins.length ? 7 : 6,
        mapId: GOOGLE_MAPS_MAP_ID,
        // 'cooperative' = ctrl/two-finger to zoom, so the page still scrolls.
        gestureHandling: scrollWheelZoom ? 'greedy' : 'cooperative',
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false, // the component has its own expand button
        clickableIcons: false,
      });
      infoWindow = new InfoWindow();

      pins.forEach((p) => {
        const content = document.createElement('div');
        content.style.cssText = PIN_STYLE;
        const marker = new AdvancedMarkerElement({ map, position: { lat: p.lat, lng: p.lng }, content });
        marker.addListener('click', () => {
          infoWindow.setContent(p.html);
          infoWindow.open({ map, anchor: marker });
        });
        markers.push(marker);
      });
    } catch (err) {
      if (!destroyed) {
        console.warn('[maps] Google Maps unavailable, using the fallback map:', (err as Error).message);
        onFail();
      }
    }
  })();

  return {
    destroy: () => {
      destroyed = true;
      infoWindow?.close();
      markers.forEach((m) => (m.map = null));
      container.innerHTML = '';
    },
    resize: () => {}, // Google Maps tracks its container size itself
  };
}

export default function DestinationMap({
  tours,
  heightClassName = 'h-64 sm:h-80',
}: {
  tours: ApiTour[];
  heightClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapHandle | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const modalMapRef = useRef<MapHandle | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { locale, t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  // Google Maps when a key is configured; Leaflet + Esri otherwise, or as
  // soon as Google fails to load or rejects the key.
  const [useGoogle, setUseGoogle] = useState(googleMapsEnabled);
  useEffect(() => onGoogleMapsAuthFailure(() => setUseGoogle(false)), []);

  const build = (container: HTMLDivElement, scrollWheelZoom: boolean): MapHandle => {
    const pins = pinsFor(tours, t('map.viewTour'), locale);
    return useGoogle
      ? createGoogleMap(container, pins, scrollWheelZoom, locale, () => setUseGoogle(false))
      : createLeafletMap(container, pins, scrollWheelZoom);
  };

  // Small embedded map - scroll-to-zoom stays off here.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = build(containerRef.current, false);
    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, locale, useGoogle]);

  // Expanded modal map - built fresh each time it opens (Leaflet doesn't
  // like being reparented, so a new instance is simpler and more robust
  // than trying to move the existing one into the modal). Scroll-to-zoom
  // is on here - this view exists specifically so you can zoom with the
  // touchpad without it fighting the page's own scrolling.
  useEffect(() => {
    if (!expanded || !modalContainerRef.current || modalMapRef.current) return;
    const map = build(modalContainerRef.current, true);
    modalMapRef.current = map;
    // The modal (and its size) only exists from this render onward, so
    // Leaflet's initial size read can be stale - nudge it once the browser
    // has actually painted the new layout.
    const raf = requestAnimationFrame(() => map.resize());
    return () => {
      cancelAnimationFrame(raf);
      map.destroy();
      modalMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, tours, locale, useGoogle]);

  // Lock page scroll while the modal is open, let Escape close it, and
  // trap Tab/Shift+Tab inside it - without this, a keyboard or
  // screen-reader user could tab straight past the close button into the
  // nav/header sitting behind what's visually a fullscreen overlay.
  // Focusable elements are re-queried on every Tab press rather than
  // captured once, because Leaflet adds its own focusable zoom controls
  // (and a "View tour" link inside any open marker popup) dynamically,
  // after this effect has already run.
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      // Return focus to whatever opened the modal (normally the expand
      // button) rather than leaving it on a now-removed close button.
      (previouslyFocused ?? expandButtonRef.current)?.focus();
    };
  }, [expanded]);

  return (
    <>
      <div className="relative">
        <div
          ref={containerRef}
          className={`relative z-0 isolate w-full ${heightClassName} rounded-xl overflow-hidden border border-border`}
        />
        <button
          ref={expandButtonRef}
          onClick={() => setExpanded(true)}
          title={t('map.expand')}
          aria-label={t('map.expand')}
          className="absolute top-2 right-2 z-[1000] bg-white/90 hover:bg-white text-foreground shadow-sm rounded-lg p-1.5 transition-colors"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {expanded &&
        createPortal(
          // Rendered straight into <body> instead of staying in the React
          // tree here - the sidebar this component normally lives in is
          // `position: sticky`, which always creates its own stacking
          // context. Left in place, this modal's z-index would only ever
          // win *inside* that sidebar's context, never against the nav,
          // hero, or results grid sitting in sibling parts of the page - a
          // portal escapes that trap entirely.
          <div
            className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setExpanded(false)}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={t('map.expand')}
              className="bg-card rounded-2xl overflow-hidden w-full max-w-5xl h-[85vh] relative shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={closeButtonRef}
                onClick={() => setExpanded(false)}
                title={t('map.close')}
                aria-label={t('map.close')}
                className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white text-foreground shadow-sm rounded-full p-2 transition-colors"
              >
                <X size={18} />
              </button>
              <div ref={modalContainerRef} className="w-full h-full" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
