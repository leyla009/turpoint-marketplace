'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, MapPin, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { todayLocalISODate } from '../lib/date';
import type { AccountSection } from './AccountMenu';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_STYLE: Record<string, { Icon: any; className: string; labelKey: 'status.pending' | 'status.confirmed' | 'status.cancelled' }> = {
  pending: { Icon: Clock, className: 'text-primary bg-primary/10', labelKey: 'status.pending' },
  confirmed: { Icon: CheckCircle2, className: 'text-accent bg-accent/10', labelKey: 'status.confirmed' },
  cancelled: { Icon: XCircle, className: 'text-muted-foreground bg-muted', labelKey: 'status.cancelled' },
};

// Focused floating panel for exactly one account section at a time -
// picked from AccountMenu's small dropdown. Centered + portaled to <body>,
// same pattern (and same reason) as CompareModal/PlannerModal.
export default function AccountDetailModal({
  section,
  onClose,
}: {
  section: AccountSection;
  onClose: () => void;
}) {
  const { user, token, login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [idNumber, setIdNumber] = useState(user?.id_number ?? '');
  const [savingId, setSavingId] = useState(false);
  const [idError, setIdError] = useState('');

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (section === 'info' || section === 'documents' || !token) {
      setLoadingBookings(false);
      return;
    }
    fetch(`${API_URL}/api/bookings/my-trips`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  }, [section, token]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, string> = { name, email };
      if (password) body.password = password;
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('profile.somethingWrong'));
        return;
      }
      login(data.token, data.user);
      setPassword('');
      showToast(t('profile.saved'));
    } catch {
      setError(t('profile.couldntReachBackend'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveId(e: React.FormEvent) {
    e.preventDefault();
    setIdError('');
    setSavingId(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_number: idNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIdError(data.error ?? t('profile.somethingWrong'));
        return;
      }
      login(data.token, data.user);
      showToast(t('account.idNumberSaved'));
    } catch {
      setIdError(t('profile.couldntReachBackend'));
    } finally {
      setSavingId(false);
    }
  }

  const today = todayLocalISODate();
  const list = section === 'bookings' ? bookings.filter((b) => b.tour_date >= today) : bookings.filter((b) => b.tour_date < today);
  const emptyKey = section === 'bookings' ? 'account.noUpcomingBookings' : 'account.noHistory';

  const titleKey =
    section === 'info'
      ? 'account.personalInfo'
      : section === 'documents'
      ? 'account.myDocuments'
      : section === 'bookings'
      ? 'account.myBookings'
      : 'account.history';

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto relative shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          title={t('map.close')}
          aria-label={t('map.close')}
          className="absolute top-3 right-3 z-10 bg-muted hover:bg-border text-foreground rounded-full p-2 transition-colors"
        >
          <X size={18} />
        </button>

        <h2
          className="text-lg font-bold text-foreground mb-4 pr-10"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t(titleKey)}
        </h2>

        {section === 'info' && (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">{t('login.fullName')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">{t('login.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">{t('account.newPassword')}</label>
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('account.newPasswordPlaceholder')}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5 disabled:opacity-50"
            >
              {saving ? t('profile.saving') : t('profile.saveChanges')}
            </button>
          </form>
        )}

        {section === 'documents' && (
          <form onSubmit={handleSaveId} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">{t('account.idNumber')}</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={t('account.idNumberPlaceholder')}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1.5">{t('account.idNumberHint')}</p>
            </div>

            {idError && <p className="text-xs text-danger">{idError}</p>}

            <button
              type="submit"
              disabled={savingId}
              className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5 disabled:opacity-50"
            >
              {savingId ? t('profile.saving') : t('profile.saveChanges')}
            </button>
          </form>
        )}

        {(section === 'bookings' || section === 'history') &&
          (loadingBookings ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('dashboard.loading')}</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t(emptyKey)}</p>
          ) : (
            <div className="space-y-2">
              {list.map((b) => {
                const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.confirmed;
                const StatusIcon = style.Icon;
                return (
                  <Link
                    key={b.id}
                    href={`/bookings/${b.id}`}
                    onClick={onClose}
                    className="block bg-background border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{b.tour_title}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin size={11} /> {b.tour_location}
                          <span className="mx-1">·</span>
                          <Calendar size={11} /> {b.tour_date}
                        </p>
                      </div>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${style.className}`}
                      >
                        <StatusIcon size={10} /> {t(style.labelKey)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs">
                      <span className="font-mono text-muted-foreground">{b.ticket_code}</span>
                      <span className="font-semibold text-foreground">AZN{b.total_price}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
      </div>
    </div>,
    document.body
  );
}
