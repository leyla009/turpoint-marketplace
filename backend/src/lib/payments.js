// Simulated payment gateway with a Stripe-shaped interface.
//
// No real money moves and card numbers are NEVER stored - only the brand and
// last 4 digits. The three calls below (authorize / capture / refund-or-void)
// deliberately mirror Stripe's PaymentIntent flow, so swapping in real Stripe
// later means replacing the bodies of these functions, not the routes.
//
// Test cards (same idea as Stripe's test mode):
//   4242 4242 4242 4242  -> succeeds
//   4000 0000 0000 0002  -> declined
//   4000 0000 0000 9995  -> declined (insufficient funds)
// Any other 16-digit number that passes the Luhn check succeeds.

import crypto from 'node:crypto';
import { db } from '../db/index.js';

const DECLINE_CARDS = {
  '4000000000000002': 'Your card was declined.',
  '4000000000009995': 'Your card has insufficient funds.',
};

const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '');

function luhnOk(num) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function brandOf(num) {
  if (/^4/.test(num)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'mastercard';
  return 'card';
}

// Shape validation only. Returns { ok:true, last4, brand } or { ok:false, error }.
export function validateCard({ card_number, expiry, cvc } = {}) {
  const num = digitsOnly(card_number);
  if (num.length !== 16 || !luhnOk(num)) return { ok: false, error: 'invalid card number' };

  if (expiry !== undefined) {
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(expiry).trim());
    if (!m) return { ok: false, error: 'expiry must look like MM/YY' };
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) return { ok: false, error: 'invalid expiry month' };
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      return { ok: false, error: 'card has expired' };
    }
  }
  if (cvc !== undefined && !/^\d{3,4}$/.test(String(cvc))) return { ok: false, error: 'invalid CVC' };

  return { ok: true, last4: num.slice(-4), brand: brandOf(num), number: num };
}

const newRef = (prefix) => `${prefix}_sim_${crypto.randomBytes(8).toString('hex')}`;

// Runs the "bank". Returns { ok, ref, error }. Does not touch the DB.
export function authorize(card, amount) {
  if (DECLINE_CARDS[card.number]) return { ok: false, error: DECLINE_CARDS[card.number] };
  if (!(amount > 0)) return { ok: false, error: 'amount must be positive' };
  return { ok: true, ref: newRef('pi') };
}

// ---- Ledger: every money movement is one immutable row in `payments` ----
// type: 'charge' | 'hold' | 'capture' | 'refund' | 'void'

export function recordPayment({ bookingId, type, amount, status = 'succeeded', providerRef, cardLast4, cardBrand, note }) {
  return db
    .prepare(
      `INSERT INTO payments (booking_id, type, amount, status, provider_ref, card_last4, card_brand, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(bookingId, type, amount, status, providerRef ?? null, cardLast4 ?? null, cardBrand ?? null, note ?? null);
}

// Booking is confirmed immediately -> money is taken now.
// Booking is pending (group not full) -> only a hold, captured when the group confirms.
export function recordInitialPayment(booking, { ref, last4, brand }) {
  const isHold = booking.status === 'pending';
  recordPayment({
    bookingId: booking.id,
    type: isHold ? 'hold' : 'charge',
    amount: booking.total_price,
    providerRef: ref,
    cardLast4: last4,
    cardBrand: brand,
  });
  db.prepare('UPDATE bookings SET payment_status = ?, paid_amount = ?, payment_ref = ?, card_last4 = ?, card_brand = ? WHERE id = ?')
    .run(isHold ? 'authorized' : 'paid', isHold ? 0 : booking.total_price, ref, last4, brand, booking.id);
}

// Group reached its minimum: turn the hold into a real charge.
export function captureHold(bookingId) {
  const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!b || b.payment_status !== 'authorized') return;
  recordPayment({ bookingId, type: 'capture', amount: b.total_price, providerRef: b.payment_ref, cardLast4: b.card_last4, cardBrand: b.card_brand });
  db.prepare("UPDATE bookings SET payment_status = 'paid', paid_amount = total_price WHERE id = ?").run(bookingId);
}

// Release a hold (pending booking cancelled / group expired): nothing was ever taken.
export function voidHold(bookingId, note) {
  const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!b || b.payment_status !== 'authorized') return;
  recordPayment({ bookingId, type: 'void', amount: 0, providerRef: b.payment_ref, cardLast4: b.card_last4, cardBrand: b.card_brand, note });
  db.prepare("UPDATE bookings SET payment_status = 'voided' WHERE id = ?").run(bookingId);
}

// Refund part or all of a captured payment. amount 0 is recorded too, so
// "no refund due to late cancellation" is visible in the ledger.
export function refundPayment(bookingId, amount, note) {
  const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!b || b.payment_status !== 'paid') return null;
  const ref = newRef('re');
  recordPayment({ bookingId, type: 'refund', amount, providerRef: ref, cardLast4: b.card_last4, cardBrand: b.card_brand, note });
  const status = amount <= 0 ? 'paid' : amount >= b.paid_amount ? 'refunded' : 'partially_refunded';
  db.prepare('UPDATE bookings SET payment_status = ?, refund_amount = ? WHERE id = ?').run(status, amount, bookingId);
  return ref;
}
