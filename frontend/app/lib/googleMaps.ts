// Google Maps Platform (Maps JavaScript API) loader.
//
// Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in frontend/.env.local (and in the
// hosting provider's env for production), then restart `npm run dev`.
// Without a key - or if Google rejects it - DestinationMap falls back to the
// free Esri/Leaflet map, so the site never shows a broken map.
//
// This key is used in the browser, so it is public by design. Protect it in
// Google Cloud Console -> APIs & Services -> Credentials:
//   - Application restrictions: Websites, e.g. http://localhost:3000/* and
//     https://your-domain/*
//   - API restrictions: Maps JavaScript API only
//
// NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is optional: a Map ID from Cloud Console
// (Map Management) for custom map styling. Without one Google's DEMO_MAP_ID
// is used, which supports the markers but uses the default look.

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

const AUTH_FAILED_EVENT = 'turpoint:google-maps-auth-failed';
let loader: Promise<any> | null = null;
let authFailed = false;

export const googleMapsEnabled = () => !!GOOGLE_MAPS_API_KEY && !authFailed;

// Google calls window.gm_authFailure when the key is invalid, not enabled for
// the Maps JavaScript API, missing billing, or blocked by its referrer
// restriction. That happens AFTER the script loads, so maps listen for this
// event and swap themselves over to the fallback.
export function onGoogleMapsAuthFailure(handler: () => void): () => void {
  window.addEventListener(AUTH_FAILED_EVENT, handler);
  return () => window.removeEventListener(AUTH_FAILED_EVENT, handler);
}

// Loads the Maps JavaScript API once per page and resolves with `google.maps`.
export function loadGoogleMaps(language: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps needs a browser'));
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'));
  if (authFailed) return Promise.reject(new Error('Google Maps rejected the API key'));
  const w = window as any;
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google.maps);
  if (loader) return loader;

  w.gm_authFailure = () => {
    authFailed = true;
    console.warn('[maps] Google Maps rejected the API key - using the fallback map. Check the key, its referrer restrictions and that the Maps JavaScript API and billing are enabled.');
    window.dispatchEvent(new Event(AUTH_FAILED_EVENT));
  };

  loader = new Promise((resolve, reject) => {
    const callback = '__turpointGoogleMapsReady';
    w[callback] = () => {
      delete w[callback];
      resolve(w.google.maps);
    };
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      v: 'weekly',
      loading: 'async',
      language,
      region: 'AZ',
      callback,
    });
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loader = null; // allow a retry on the next map mount
      script.remove();
      reject(new Error('Google Maps script failed to load'));
    };
    document.head.appendChild(script);
  });
  return loader;
}
