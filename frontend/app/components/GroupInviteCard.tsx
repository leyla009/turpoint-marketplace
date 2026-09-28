'use client';

import { useEffect, useState } from 'react';
import { Users, Link2, MessageCircle, Send, Share2 } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useToast } from '@/app/context/ToastContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Group {
  status: 'waiting' | 'forming' | 'confirmed' | 'cancelled';
  current_participants: number;
  min_participants: number;
}

interface Props {
  tourId: number | string;
  tourTitle: string;
  minParticipants: number;
  maxParticipants: number;
  /** Bump this to re-fetch the group (e.g. right after a booking is made). */
  refreshKey?: number;
}

// "Invite friends" card for group tours: shows how close the group is to its
// minimum and lets a traveler share the tour link (WhatsApp, Telegram, native
// share sheet, or copy). Read-only against GET /api/group-formations, so no
// backend changes are needed. Hidden for tours that don't need a group.
export default function GroupInviteCard({ tourId, tourTitle, minParticipants, maxParticipants, refreshKey = 0 }: Props) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/group-formations?tour_id=${tourId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => !cancelled && setGroup(data))
      .catch(() => !cancelled && setGroup(null));
    return () => {
      cancelled = true;
    };
  }, [tourId, refreshKey]);

  const min = group?.min_participants ?? minParticipants;
  if (min <= 1) return null; // nothing to recruit for

  const current = group?.current_participants ?? 0;
  const confirmed = group?.status === 'confirmed';
  const cancelled = group?.status === 'cancelled';
  if (cancelled) return null;

  const needed = Math.max(0, min - current);
  const spotsLeft = Math.max(0, maxParticipants - current);
  const pct = Math.min(100, Math.round((current / min) * 100));

  const url = typeof window !== 'undefined' ? `${window.location.origin}/tours/${tourId}` : '';
  const message = t('invite.shareText', { title: tourTitle });

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('invite.linkCopied'));
    } catch {
      showToast(t('invite.copyFailed'), 'error');
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: tourTitle, text: message, url });
    } catch {
      /* user dismissed the share sheet - nothing to do */
    }
  }

  const btn =
    'flex-1 min-w-[110px] flex items-center justify-center gap-1.5 bg-card border border-border text-foreground text-xs font-semibold py-2.5 rounded-xl hover:border-primary/40 transition-colors';

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-1">
        <Users size={15} className="text-primary" /> {t('invite.title')}
      </h2>
      <p className="text-xs text-muted-foreground mb-3">{t('invite.hint')}</p>

      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-foreground">
          {t('invite.progress', { current, min })}
        </span>
        <span className={confirmed ? 'font-semibold text-accent' : 'text-muted-foreground'}>
          {confirmed ? t('invite.confirmed') : t('invite.needMore', { count: needed })}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${confirmed ? 'bg-accent' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {confirmed && (
        <p className="text-[11px] text-muted-foreground mb-3">{t('invite.spotsLeft', { count: spotsLeft })}</p>
      )}
      {!confirmed && <div className="mb-3" />}

      <div className="flex flex-wrap gap-2">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={btn}>
          <MessageCircle size={14} /> {t('invite.whatsapp')}
        </a>
        <a href={telegramHref} target="_blank" rel="noopener noreferrer" className={btn}>
          <Send size={14} /> {t('invite.telegram')}
        </a>
        <button type="button" onClick={copyLink} className={btn}>
          <Link2 size={14} /> {t('invite.copyLink')}
        </button>
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className={btn}>
            <Share2 size={14} /> {t('invite.share')}
          </button>
        )}
      </div>
    </div>
  );
}
