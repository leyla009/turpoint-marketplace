'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send, Sparkles, Loader2, MapPin, Star, RotateCcw, Bookmark, BookmarkCheck, Database, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '@/app/context/ToastContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { titleFromI18n, placeName } from '@/app/lib/tourContent';
import { formatAzn } from '@/app/lib/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PlannerActivity {
  titleI18n?: string | null;
  tourId: number;
  title: string;
  location: string | null;
  category: string | null;
  durationDays: number;
  price: number;
  discountedPrice: number | null;
  rating: number | null;
  reviewCount: number;
  reason: string;
}

interface PlannerItinerary {
  tripSummary: string;
  travelers: number;
  days: { day: number; destination: string | null; activities: PlannerActivity[] }[];
  estimatedCost: number;
  toursCount: number;
  destinationsCount: number;
  notes: string[];
}

interface AlternativeTour {
  id: number;
  title: string;
  title_i18n?: string | null;
  location: string | null;
  duration_days: number;
  price: number;
  discounted_price?: number | null;
  rating?: number | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  itinerary?: PlannerItinerary;
  alternatives?: AlternativeTour[];
  isError?: boolean;
}

interface TourRow {
  id: number;
  title: string;
  titleI18n?: string | null;
  location: string | null;
  durationDays: number;
  price: number;
  discountedPrice: number | null;
  rating: number | null;
  reason?: string;
}

const fromActivity = (a: PlannerActivity): TourRow => ({
  id: a.tourId,
  title: a.title,
  titleI18n: a.titleI18n ?? null,
  location: a.location,
  durationDays: a.durationDays,
  price: a.price,
  discountedPrice: a.discountedPrice,
  rating: a.rating,
  reason: a.reason,
});

const fromAlternative = (t: AlternativeTour): TourRow => ({
  id: t.id,
  title: t.title,
  titleI18n: t.title_i18n ?? null,
  location: t.location,
  durationDays: t.duration_days,
  price: t.price,
  discountedPrice: t.discounted_price ?? null,
  rating: t.rating ?? null,
});

const QUICK_STARTS = [
  { labelKey: 'planner.quickStartWeekend', promptKey: 'planner.quickStartWeekendPrompt' },
  { labelKey: 'planner.quickStartFirstTrip', promptKey: 'planner.quickStartFirstTripPrompt' },
  { labelKey: 'planner.quickStartNature', promptKey: 'planner.quickStartNaturePrompt' },
  { labelKey: 'planner.quickStartFood', promptKey: 'planner.quickStartFoodPrompt' },
  { labelKey: 'planner.quickStartFamily', promptKey: 'planner.quickStartFamilyPrompt' },
  { labelKey: 'planner.quickStartBudget', promptKey: 'planner.quickStartBudgetPrompt' },
] as const;

// The Smart Planner: describe a trip in a sentence, the backend's
// /api/planner/chat extracts what you want and replies with an itinerary
// built ONLY from tours that really exist on TurPoint. Follow-ups refine
// the same itinerary by sending it back as `currentItinerary`.
export default function PlannerPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { token } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [sending, setSending] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<PlannerItinerary | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  // /planner?q=... (from the homepage "Your trip in a sentence" box) starts
  // the conversation with that sentence. The ref stops React's dev-mode
  // double effect from sending it twice; the URL is cleaned so a refresh
  // doesn't send it again.
  const startedFromQuery = useRef(false);
  useEffect(() => {
    if (startedFromQuery.current) return;
    startedFromQuery.current = true;
    const q = new URLSearchParams(window.location.search).get('q')?.trim();
    if (!q) return;
    window.history.replaceState(null, '', '/planner');
    sendMessage(q.slice(0, 500));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setPrompt('');
    setFollowUp('');
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/planner/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, locale, history, currentItinerary: currentItinerary ?? undefined }),
      });
      if (!res.ok) throw new Error('planner request failed');
      const data = await res.json();

      if (data.phase === 'itinerary' && data.itinerary) {
        setCurrentItinerary(data.itinerary);
        setMessages((prev) => [...prev, { role: 'assistant', text: data.itinerary.tripSummary || data.message, itinerary: data.itinerary }]);
      } else if (data.phase === 'no_match') {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.message, alternatives: data.alternatives ?? [] }]);
      } else if (data.phase === 'clarify') {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.message }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.message || t('planner.networkError'), isError: true }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('planner.networkError'), isError: true }]);
    } finally {
      setSending(false);
    }
  }

  function handleNewTrip() {
    setMessages([]);
    setCurrentItinerary(null);
    setPrompt('');
    setFollowUp('');
    setSavedIndices(new Set());
  }

  async function handleSaveTrip(itinerary: PlannerItinerary, index: number) {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/planner/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: itinerary.tripSummary.slice(0, 80) || t('planner.title'), trip: itinerary }),
      });
      if (!res.ok) throw new Error('save failed');
      setSavedIndices((prev) => new Set(prev).add(index));
      showToast(t('planner.tripSaved'));
    } catch {
      showToast(t('planner.networkError'), 'error');
    }
  }

  function renderTourRow(row: TourRow) {
    return (
      <button
        key={row.id}
        onClick={() => router.push(`/tours/${row.id}`)}
        className="w-full text-left flex items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/40 hover:shadow-card transition-all group"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary">
            {titleFromI18n(row.title, row.titleI18n, locale)}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            {row.location && (
              <>
                <MapPin size={11} /> {placeName(row.location, locale)} ·{' '}
              </>
            )}
            {t('planner.dayCount', { count: row.durationDays })}
            {typeof row.rating === 'number' && row.rating > 0 && (
              <span className="flex items-center gap-0.5 ml-1">
                <Star size={11} className="fill-rating text-rating" /> {row.rating.toFixed(1)}
              </span>
            )}
          </p>
          {row.reason && <p className="text-xs text-muted-foreground mt-1">{row.reason}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            {row.discountedPrice != null && <p className="text-xs text-muted-foreground line-through">{formatAzn(row.price)}</p>}
            <p className="text-sm font-bold text-foreground">{formatAzn(row.discountedPrice ?? row.price)}</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-0.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md px-2.5 py-1">
            {t('ui.planner.book')} <ChevronRight size={12} />
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">
        {/* Prompt panel */}
        <section className="relative rounded-2xl overflow-hidden bg-navy text-white lg:sticky lg:top-24">
          <img src="/pictures/U2.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/80 to-navy" />
          <div className="relative p-6 sm:p-8">
            <span className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
              <Sparkles size={22} />
            </span>
            <h1 className="text-2xl font-bold">{t('ui.planner.heading')}</h1>
            <p className="text-sm text-white/75 mt-2">{t('planner.introBody')}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(prompt);
              }}
              className="mt-5"
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(prompt);
                  }
                }}
                rows={4}
                placeholder={t('planner.inputPlaceholder')}
                disabled={sending}
                className="w-full text-sm text-foreground bg-card rounded-xl px-4 py-3 outline-none resize-none placeholder:text-muted-foreground disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={sending || !prompt.trim()}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold py-3 rounded-lg disabled:opacity-60 transition-colors"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {t('ui.planner.buildTrip')}
              </button>
            </form>

            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mt-6 mb-2">{t('ui.planner.tryOne')}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_STARTS.map((q) => (
                <button
                  key={q.labelKey}
                  onClick={() => sendMessage(t(q.promptKey))}
                  disabled={sending}
                  className="text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/15 rounded-full px-3 py-1.5 transition-colors disabled:opacity-60"
                >
                  {t(q.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="bg-card border border-border rounded-2xl min-h-[520px] flex flex-col">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={18} className="text-primary shrink-0" />
              <h2 className="text-base font-bold text-foreground truncate">
                {currentItinerary ? currentItinerary.tripSummary : t('ui.planner.yourItinerary')}
              </h2>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleNewTrip}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted shrink-0"
              >
                <RotateCcw size={13} /> {t('planner.newTrip')}
              </button>
            )}
          </div>

          <div className="flex-1 px-5 sm:px-6 py-5">
            {messages.length === 0 ? (
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center">
                <span className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles size={24} className="text-primary" />
                </span>
                <h3 className="text-lg font-bold text-foreground">{t('planner.introTitle')}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">{t('ui.planner.emptyBody')}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={m.role === 'user' ? 'max-w-[85%]' : 'w-full'}>
                      <div
                        className={`text-sm rounded-2xl px-4 py-2.5 ${
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : m.isError
                            ? 'bg-danger/10 text-danger rounded-bl-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}
                      >
                        {m.text}
                      </div>

                      {m.itinerary && (
                        <div className="mt-4 space-y-4">
                          {m.itinerary.days.map((day) => (
                            <div key={day.day} className="border-l-2 border-primary/25 pl-4">
                              <p className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-primary-foreground bg-primary rounded px-2 py-0.5">
                                  {t('planner.dayLabel', { count: day.day })}
                                </span>
                                {day.destination}
                              </p>
                              <div className="space-y-2">{day.activities.map((a) => renderTourRow(fromActivity(a)))}</div>
                            </div>
                          ))}

                          {m.itinerary.notes.length > 0 && (
                            <div className="bg-surface-sand rounded-lg p-3.5">
                              <p className="text-xs font-bold text-foreground mb-1">{t('planner.notesTitle')}</p>
                              <ul className="space-y-0.5">
                                {m.itinerary.notes.map((n, ni) => (
                                  <li key={ni} className="text-xs text-muted-foreground">
                                    • {n}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted rounded-lg px-4 py-3">
                            <div>
                              <p className="text-xs text-muted-foreground">{t('planner.estimatedCost')}</p>
                              <p className="text-lg font-bold text-foreground">{formatAzn(m.itinerary.estimatedCost)}</p>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>{t('planner.toursCount', { count: m.itinerary.toursCount })}</span>
                              <span>{t('planner.destinationsCount', { count: m.itinerary.destinationsCount })}</span>
                              <span>{t('planner.travelersSummary', { count: m.itinerary.travelers })}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="flex items-center gap-1.5 text-xs text-primary">
                              <Database size={13} /> {t('ui.planner.realTours')}
                            </p>
                            {token ? (
                              <button
                                onClick={() => handleSaveTrip(m.itinerary!, i)}
                                disabled={savedIndices.has(i)}
                                className="flex items-center gap-1.5 text-sm font-semibold border border-border rounded-lg px-4 py-2 hover:border-primary/40 disabled:text-success disabled:cursor-default"
                              >
                                {savedIndices.has(i) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                                {savedIndices.has(i) ? t('planner.tripSaved') : t('planner.saveTrip')}
                              </button>
                            ) : (
                              <Link href="/login?next=/planner" className="text-xs text-muted-foreground hover:text-primary">
                                {t('planner.signInToSave')}
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {m.alternatives && m.alternatives.length > 0 && (
                        <div className="mt-3 space-y-2">{m.alternatives.map((alt) => renderTourRow(fromAlternative(alt)))}</div>
                      )}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 w-fit">
                    <Loader2 size={14} className="animate-spin" /> {t('planner.thinking')}
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(followUp);
              }}
              className="flex items-center gap-2 p-4 border-t border-border"
            >
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder={t('planner.followUpPlaceholder')}
                disabled={sending}
                className="flex-1 text-sm bg-card border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !followUp.trim()}
                aria-label={t('planner.send')}
                className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg w-10 h-10 shrink-0 hover:bg-primary-hover disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
