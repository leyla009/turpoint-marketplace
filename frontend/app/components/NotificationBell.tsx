'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL, NOTIFICATIONS_CHANGED_EVENT } from '../lib/notifications';

const POLL_MS = 15_000;

// Bell with an unread badge, linking to /notifications. Polls a tiny
// endpoint once a minute, only while the tab is visible (a background tab
// costs the server nothing), plus once whenever the tab regains focus.
export default function NotificationBell({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!token) return;
    fetch(`${API_URL}/api/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && typeof data.count === 'number' && setCount(data.count))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) {
      setCount(0);
      return;
    }
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    };
  }, [token, refresh, pathname]);

  if (!user) return null;

  const label = count > 0 ? `${t('nav.notifications')} (${count})` : t('nav.notifications');

  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={t('nav.notifications')}
      className={`relative w-9 h-9 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center transition-colors shrink-0`}
    >
      <Bell size={size === 'sm' ? 16 : 17} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-danger text-danger-foreground text-[10px] font-bold leading-[17px] text-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
