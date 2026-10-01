// Refund rules for cancelled bookings - one pure function, no DB access, so
// the same numbers power the "you will get X back" preview AND the real cancel.
//
// Tiers (by whole days between today in Baku and the tour date):
//   7+ days before   -> 100% refund
//   3-6 days before  ->  50% refund
//   0-2 days before  ->   0% refund (same-day and next-day cancellations)
// Overrides that ignore the tiers:
//   - operator cancels the booking        -> always 100%
//   - booking still 'pending' (the group hasn't reached its minimum, so the
//     card was only authorized, never captured) -> always 100% (the hold is voided)

export const REFUND_TIERS = [
  { minDays: 7, percent: 100 },
  { minDays: 3, percent: 50 },
  { minDays: 0, percent: 0 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function todayInBaku(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' });
}

// Whole days from `now` (Baku calendar day) to the tour's date. Both are
// reduced to YYYY-MM-DD and compared as UTC midnights, so DST/time-of-day
// can never shift the result by a day.
export function daysUntilTour(tourDate, now = new Date()) {
  const toUtc = (ymd) => {
    const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(tourDate) - toUtc(todayInBaku(now))) / MS_PER_DAY);
}

export function computeRefund({ totalPrice, tourDate, bookingStatus, cancelledBy = 'traveler', now = new Date() }) {
  const days = daysUntilTour(tourDate, now);
  let percent;
  let reason;

  if (cancelledBy === 'operator') {
    percent = 100;
    reason = 'operator_cancelled';
  } else if (bookingStatus === 'pending') {
    percent = 100;
    reason = 'not_charged_yet';
  } else {
    percent = REFUND_TIERS.find((t) => days >= t.minDays)?.percent ?? 0;
    reason = percent === 100 ? 'full' : percent === 50 ? 'partial' : 'none';
  }

  const total = Number(totalPrice) || 0;
  const amount = Math.round(total * percent) / 100; // 2-decimal safe: percent is an integer
  return { percent, amount, retained: Math.round((total - amount) * 100) / 100, days_before: days, reason };
}
