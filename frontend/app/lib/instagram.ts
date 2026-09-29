// Turns whatever is stored in operators.instagram ("name", "@name",
// "instagram.com/name", a full URL) into a clean handle / profile link.
// The backend now normalizes on save (backend/src/lib/instagram.js), but
// rows saved before that fix can still hold "@name", so we clean on read too.

export function instagramHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const handle = value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^@+/, '')
    .trim();
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

export function instagramUrl(value: string | null | undefined): string | null {
  const handle = instagramHandle(value);
  return handle ? `https://instagram.com/${handle}` : null;
}
