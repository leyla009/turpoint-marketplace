'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, MapPin, Calendar, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import type { AccountSection } from './AccountMenu';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  useEffect(() => {
    if (section !== 'favorites' || !token) {
      setLoadingFavorites(false);
      return;
    }
    fetch(`${API_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFavorites(Array.isArray(data) ? data : []))
      .catch(() => setFavorites([]))
      .finally(() => setLoadingFavorites(false));
  }, [section, token]);

  function removeFavorite(tourId: number) {
    setFavorites((prev) => prev.filter((f) => f.id !== tourId));
    fetch(`${API_URL}/api/favorites/${tourId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

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

  const titleKey = section === 'info' ? 'account.personalInfo' : 'account.favorites';

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

        {section === 'favorites' &&
          (loadingFavorites ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('dashboard.loading')}</p>
          ) : favorites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('account.noFavorites')}</p>
          ) : (
            <div className="space-y-2">
              {favorites.map((tour) => (
                <div
                  key={tour.id}
                  className="flex items-center gap-2 bg-background border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
                >
                  <Link href={`/tours/${tour.id}`} onClick={onClose} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{tour.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      {tour.location && (
                        <>
                          <MapPin size={11} /> {tour.location}
                          <span className="mx-1">·</span>
                        </>
                      )}
                      <Calendar size={11} /> {tour.date}
                      <span className="mx-1">·</span>
                      <span className="font-semibold text-foreground">AZN{tour.price}</span>
                    </p>
                  </Link>
                  <button
                    onClick={() => removeFavorite(tour.id)}
                    title={t('tourCard.removeFromFavorites')}
                    className="shrink-0 p-1.5 text-danger hover:bg-danger/10 rounded-full transition-colors"
                  >
                    <Heart size={16} className="fill-danger" />
                  </button>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>,
    document.body
  );
}
