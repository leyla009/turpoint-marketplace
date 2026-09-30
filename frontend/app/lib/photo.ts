// Where a stored photo path actually lives. Three kinds exist:
//
//   /uploads/...   photos operators uploaded  -> served by the BACKEND (Railway)
//   /seed/...      demo-tour cover images     -> static files in THIS app (public/seed)
//   https://...    any full web address       -> used as-is
//
// Every place that shows a tour/operator photo goes through this, so adding
// another kind later is a one-line change here.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function photoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  return url;
}
