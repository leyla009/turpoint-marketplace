// Local calendar date as YYYY-MM-DD. Deliberately NOT
// `new Date().toISOString().slice(0, 10)` - toISOString() converts to UTC
// first, so for anyone in a timezone ahead of UTC (Azerbaijan is UTC+4)
// this would show yesterday's date for the first few hours after local
// midnight, since UTC hadn't rolled over to the new day yet.
export function todayLocalISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
