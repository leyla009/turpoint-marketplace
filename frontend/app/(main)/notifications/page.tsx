'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, CheckCircle2, Clock, Star, Tag, Ticket, Users, X, XCircle, AlertCircle } from 'lucide-react';
import { useAuth, useRequireAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import PageContainer from '@/app/components/PageContainer';
import { formatDate } from '@/app/lib/format';
import {
  API_URL,
  MESSAGE_KEYS,
  notifyChanged,
  parseServerTime,
  type AppNotification,
  type NotificationType,
} from '@/app/lib/notifications';

const PAGE_SIZE = 30;

const ICONS: Record<NotificationType, { Icon: any; className: string }> = {
  booking_confirmed: { Icon: CheckCircle2, className: 'text-accent bg-accent/10' },
  booking_cancelled: { Icon: XCircle, className: 'text-danger bg-danger/10' },
  group_expired: { Icon: Clock, className: 'text-muted-foreground bg-muted' },
  deal_on_favorite: { Icon: Tag, className: 'text-primary bg-primary/10' },
  new_booking: { Icon: Ticket, className: 'text-primary bg-primary/10' },
  booking_cancelled_by_traveler: { Icon: XCircle, className: 'text-danger bg-danger/10' },
  group_confirmed: { Icon: Users, className: 'text-accent bg-accent/10' },
  new_review: { Icon: Star, className: 'text-primary bg-primary/10' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token } = useAuth();
  const { t, locale } = useLanguage();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const load = useCallback(
    async (before?: number) => {
      if (!token) return;
      const url = `${API_URL}/api/notifications?limit=${PAGE_SIZE}${before ? `&before=${before}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      setItems((prev) => (before ? [...prev, ...data.notifications] : data.notifications));
      setHasMore(data.has_more);
      setUnread(data.unread_count);
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    setError(false);
    load()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token, load]);

  function timeAgo(value: string): string {
    const then = parseServerTime(value);
    const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
    if (minutes < 1) return t('notifications.justNow');
    if (minutes < 60) return t('notifications.minutesAgo', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('notifications.daysAgo', { n: days });
    return formatDate(then.toISOString(), locale);
  }

  async function handleOpen(n: AppNotification) {
    if (!n.is_read) {
      // Optimistic: the badge and row update at once; the server catches up.
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      fetch(`${API_URL}/api/notifications/${n.id}/read`, { method: 'POST', headers: authHeaders })
        .then(notifyChanged)
        .catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, { method: 'POST', headers: authHeaders });
    } finally {
      notifyChanged();
    }
  }

  async function handleDelete(n: AppNotification) {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.is_read) setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch(`${API_URL}/api/notifications/${n.id}`, { method: 'DELETE', headers: authHeaders });
    } finally {
      notifyChanged();
    }
  }

  async function handleLoadMore() {
    if (!items.length) return;
    setLoadingMore(true);
    try {
      await load(items[items.length - 1].id);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  return (
    <PageContainer maxWidth="max-w-2xl">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="font-display text-xl font-bold text-foreground">{t('notifications.title')}</h1>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary shrink-0 mt-1"
          >
            <CheckCheck size={14} /> {t('notifications.markAllRead')}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {unread > 0 ? t('notifications.unreadCount', { n: unread }) : t('notifications.subtitle')}
      </p>

      {error && items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <AlertCircle size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('notifications.couldntLoad')}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <Bell size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const style = ICONS[n.type] ?? ICONS.new_review;
            const Icon = style.Icon;
            const messageKey = MESSAGE_KEYS[n.type];
            return (
              <div
                key={n.id}
                className={`flex items-stretch bg-card border rounded-xl transition-colors ${
                  n.is_read ? 'border-border' : 'border-primary/40 bg-primary/5'
                }`}
              >
                <button
                  onClick={() => handleOpen(n)}
                  className="flex-1 min-w-0 flex items-start gap-3 p-3 text-left"
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.className}`}>
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm text-foreground ${n.is_read ? '' : 'font-semibold'}`}>
                      {messageKey ? t(messageKey, n.params) : n.type}
                    </span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2 ml-auto" aria-hidden />}
                </button>
                <button
                  onClick={() => handleDelete(n)}
                  aria-label={t('notifications.delete')}
                  title={t('notifications.delete')}
                  className="px-3 text-muted-foreground hover:text-danger transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full text-sm font-semibold text-primary py-3 disabled:opacity-60"
            >
              {loadingMore ? t('dashboard.loading') : t('notifications.loadMore')}
            </button>
          )}
        </div>
      )}
    </PageContainer>
  );
}
