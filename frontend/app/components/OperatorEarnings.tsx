'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, WalletCards } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { formatAzn, formatDate } from '@/app/lib/format';
import { titleFromI18n } from '@/app/lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface EarningsData {
  balance: number;
  pending: number;
  demo_card_last4?: string | null;
  transactions: {
    id: number;
    type: 'charge' | 'capture' | 'refund';
    amount: number;
    created_at: string;
    ticket_code: string;
    tour_title: string;
    tour_title_i18n?: string | null;
    traveler_name: string;
  }[];
}

export default function OperatorEarnings() {
  const { token } = useAuth();
  const { t, locale } = useLanguage();
  const [data, setData] = useState<EarningsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API_URL}/api/operators/me/earnings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error('earnings unavailable');
        return response.json();
      })
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('ui.earnings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('ui.earnings.demoNotice')}</p>
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <AlertCircle size={17} /> {t('analytics.loadError')}
        </p>
      ) : !data ? (
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><WalletCards size={17} /> {t('ui.earnings.balance')}</div>
              <p className="mt-2 text-3xl font-bold text-foreground">{formatAzn(data.balance)}</p>
              {data.demo_card_last4 && <p className="mt-1 text-xs text-muted-foreground">{t('ui.earnings.demoCard', { digits: data.demo_card_last4 })}</p>}
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{t('ui.earnings.pending')}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{formatAzn(data.pending)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('ui.earnings.pendingHint')}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <h2 className="border-b border-border px-5 py-4 text-sm font-bold text-foreground">{t('ui.earnings.history')}</h2>
            {data.transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t('ui.earnings.empty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.transactions.map((transaction) => {
                  const refunded = transaction.type === 'refund';
                  return (
                    <li key={transaction.id} className="flex items-center gap-3 px-5 py-4">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${refunded ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                        {refunded ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {titleFromI18n(transaction.tour_title, transaction.tour_title_i18n, locale)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {transaction.traveler_name} · {formatDate(transaction.created_at, locale)} · {transaction.ticket_code}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold ${refunded ? 'text-danger' : 'text-success'}`}>
                        {refunded ? '−' : '+'}{formatAzn(transaction.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
      <BusinessDetailsForm />
    </section>
  );
}

function BusinessDetailsForm() {
  const { token, operatorProfile, refreshOperatorProfile } = useAuth();
  const { t } = useLanguage();
  const [voen, setVoen] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setVoen(operatorProfile?.voen ?? '');
    setCardLast4(operatorProfile?.business_card_last4 ?? '');
  }, [operatorProfile?.voen, operatorProfile?.business_card_last4]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!/^\d{10}$/.test(voen)) {
      setError(t('profile.voenInvalid'));
      return;
    }
    if (!/^\d{4}$/.test(cardLast4)) {
      setError(t('profile.demoCardInvalid'));
      return;
    }
    if (!token || !operatorProfile) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/operators/${operatorProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ voen, business_card_last4: cardLast4 }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? t('profile.somethingWrong'));
        return;
      }
      await refreshOperatorProfile();
      setSaved(true);
    } catch {
      setError(t('profile.couldntReachBackend'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-base font-bold text-foreground">{t('ui.earnings.detailsTitle')}</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{t('ui.earnings.detailsHint')}</p>
      </div>
      <div>
        <label htmlFor="operator-voen" className="mb-1.5 block text-sm font-semibold text-foreground">{t('profile.voen')}</label>
        <input
          id="operator-voen"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          value={voen}
          onChange={(event) => setVoen(event.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="1234567890"
          className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-base text-foreground outline-none focus:border-primary"
        />
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{t('profile.voenHint')}</p>
      </div>
      <div>
        <label htmlFor="operator-demo-card" className="mb-1.5 block text-sm font-semibold text-foreground">{t('profile.demoCard')}</label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="rounded-lg border border-border bg-background px-3.5 py-3 font-mono text-sm text-muted-foreground">•••• •••• ••••</span>
          <input
            id="operator-demo-card"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={cardLast4}
            onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            aria-label={t('profile.demoCardLast4')}
            className="w-24 rounded-lg border border-border bg-background px-3.5 py-3 font-mono text-base text-foreground outline-none focus:border-primary"
          />
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{t('profile.demoCardHint')}</p>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {saved && <p className="text-sm font-semibold text-accent">{t('profile.saved')}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {saving ? t('profile.saving') : t('profile.saveChanges')}
      </button>
    </form>
  );
}
