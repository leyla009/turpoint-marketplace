// Normalizes whatever an operator types into the Instagram field down to a
// bare handle, so the frontend can safely build https://instagram.com/<handle>.
// Accepts "name", "@name", "instagram.com/name", "https://www.instagram.com/name/?hl=en".
// Returns null for empty input or anything that isn't a valid handle
// (Instagram handles: letters, digits, "." and "_", max 30 chars).
export function normalizeInstagram(value) {
  if (value === undefined || value === null) return null;
  let handle = String(value).trim();
  if (!handle) return null;

  handle = handle.replace(/^https?:\/\//i, '').replace(/^(www\.)?instagram\.com\//i, '');
  handle = handle.split(/[/?#]/)[0].replace(/^@+/, '').trim();

  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}
