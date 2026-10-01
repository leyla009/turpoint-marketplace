// Shared bits for the in-app notification bell and page.

import type { Locale, TranslationKey } from './translations';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Fired on window whenever this tab changes read state (page marks/deletes),
// so the nav bell refreshes its badge immediately instead of at the next poll.
export const NOTIFICATIONS_CHANGED_EVENT = 'turpoint:notifications-changed';

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'group_expired'
  | 'deal_on_favorite'
  | 'new_booking'
  | 'booking_cancelled_by_traveler'
  | 'group_confirmed'
  | 'new_review'
  | 'refund_issued'
  | 'booking_cancelled_self'
  | 'refund_issued_self';

export interface AppNotification {
  id: number;
  type: NotificationType;
  params: Record<string, unknown>;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// The message text for each type lives in translations.ts so it reads
// correctly in az / en / ru; the server only stores the type + values.
export const MESSAGE_KEYS: Record<NotificationType, TranslationKey> = {
  booking_confirmed: 'notifications.type.booking_confirmed',
  booking_cancelled: 'notifications.type.booking_cancelled',
  group_expired: 'notifications.type.group_expired',
  deal_on_favorite: 'notifications.type.deal_on_favorite',
  new_booking: 'notifications.type.new_booking',
  booking_cancelled_by_traveler: 'notifications.type.booking_cancelled_by_traveler',
  group_confirmed: 'notifications.type.group_confirmed',
  new_review: 'notifications.type.new_review',
  refund_issued: 'notifications.type.refund_issued',
  booking_cancelled_self: 'notifications.type.booking_cancelled_self',
  refund_issued_self: 'notifications.type.refund_issued_self',
};

// Params as the translator should see them. Tours with translated titles
// store every language's title next to tour_title (tour_title_i18n); pick the
// reader's. Older notifications, and tours without translations, just keep
// the plain tour_title.
export function notificationParams(
  params: Record<string, unknown> | null | undefined,
  locale: Locale
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (k === 'tour_title_i18n') continue;
    if (typeof v === 'string' || typeof v === 'number') out[k] = v;
  }
  const byLocale = params?.tour_title_i18n as Record<string, string> | undefined;
  if (byLocale && typeof byLocale === 'object') {
    out.tour_title = byLocale[locale] ?? byLocale.en ?? byLocale.az ?? out.tour_title ?? '';
  }
  return out;
}

// SQLite's CURRENT_TIMESTAMP is UTC without a "Z"; without this the browser
// would read it as local time and every "x minutes ago" would be hours off.
export function parseServerTime(value: string): Date {
  return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
}

export function notifyChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
