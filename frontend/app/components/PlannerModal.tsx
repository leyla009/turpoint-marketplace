'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Send, Sparkles, Loader2, MapPin, Star, RotateCcw, Bookmark, BookmarkCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PlannerActivity {
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

interface PlannerDay {
  day: number;
  destination: string | null;
  activities: PlannerActivity[];
}

interface PlannerItinerary {
  tripSummary: string;
  travelers: number;
  days: PlannerDay[];
  estimatedCost: number;
  toursCount: number;
  destinationsCount: number;
  notes: string[];
}

interface AlternativeTour {
  id: number;
  title: string;
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
  location: string | null;
  durationDays: number;
  price: number;
  discountedPrice: number | null;
  rating: number | null;
  reason?: string;
}

function fromActivity(a: PlannerActivity): TourRow {
  return {
    id: a.tourId,
    title: a.title,
    location: a.location,
    durationDays: a.durationDays,
    price: a.price,
    discountedPrice: a.discountedPrice,
    rating: a.rating,
    reason: a.reason,
  };
}

function fromAlternative(t: AlternativeTour): TourRow {
  return {
    id: t.id,
    title: t.title,
    location: t.location,
    durationDays: t.duration_days,
    price: t.price,
    discountedPrice: t.discounted_price ?? null,
    rating: t.rating ?? null,
  };
}

const QUICK_STARTS = [
  { labelKey: 'planner.quickStartWeekend', promptKey: 'planner.quickStartWeekendPrompt' },
  { labelKey: 'planner.quickStartFirstTrip', promptKey: 'planner.quickStartFirstTripPrompt' },
  { labelKey: 'planner.quickStartNature', promptKey: 'planner.quickStartNaturePrompt' },
  { labelKey: 'planner.quickStartFood', promptKey: 'planner.quickStartFoodPrompt' },
  { labelKey: 'planner.quickStartFamily', promptKey: 'planner.quickStartFamilyPrompt' },
  { labelKey: 'planner.quickStartBudget', promptKey: 'planner.quickStartBudgetPrompt' },
] as const;

// The Smart Planner as a real conversation instead of a budget/days/
// interests form - you describe your trip in a sentence, an AI (via the
// backend's /api/planner/chat, see backend/src/routes/planner.js) extracts
// what you actually want and replies with a reasoned itinerary built only
// from tours that really exist on TurPoint. Follow-up messages ("make it
// cheaper", "swap day 2") refine the same itinerary rather than starting
// over, by sending it back as `currentItinerary` on the next request.
export default function PlannerModal({
  onClose,
  onViewTour,
}: {
  onClose: () => void;
  onViewTour: (id: number) => void;
}) {
  const { t, locale } = useLanguage();
  const { token } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<PlannerItinerary | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const historyForRequest = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/planner/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          locale,
          history: historyForRequest,
          currentItinerary: currentItinerary ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('planner request failed');
      const data = await res.json();

      if (data.phase === 'itinerary' && data.itinerary) {
        setCurrentItinerary(data.itinerary);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.itinerary.tripSummary || data.message, itinerary: data.itinerary },
        ]);
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
    setInput('');
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

  function renderTourRow(row: TourRow) {
    return (
      <button
        key={row.id}
        onClick={() => onViewTour(row.id)}
        className="w-full text-left flex items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{row.title}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            {row.location && (
              <>
                <MapPin size={10} /> {row.location} ·{' '}
              </>
            )}
            {t('planner.dayCount', { count: row.durationDays })}
            {typeof row.rating === 'number' && row.rating > 0 && (
              <span className="flex items-center gap-0.5 ml-1">
                <Star size={10} className="fill-rating text-rating" /> {row.rating.toFixed(1)}
              </span>
            )}
          </p>
          {row.reason && <p className="text-xs text-muted-foreground mt-1 italic">{row.reason}</p>}
        </div>
        <div className="text-right shrink-0">
          {row.discountedPrice != null ? (
            <>
              <p className="text-[10px] text-muted-foreground line-through">AZN {row.price}</p>
              <p className="text-sm font-bold text-primary">AZN {row.discountedPrice}</p>
            </>
          ) : (
            <p className="text-sm font-bold text-primary">AZN {row.price}</p>
          )}
        </div>
      </button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col relative shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className="text-accent shrink-0" />
            <h2
              className="text-lg font-bold text-foreground truncate"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t('planner.title')}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={handleNewTrip}
                title={t('planner.newTrip')}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <RotateCcw size={13} /> {t('planner.newTrip')}
              </button>
            )}
            <button
              onClick={onClose}
              title={t('map.close')}
              aria-label={t('map.close')}
              className="bg-muted hover:bg-border text-foreground rounded-full p-2 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Sparkles size={30} className="text-accent mb-3" />
              <h3
                className="text-xl font-bold text-foreground mb-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t('planner.introTitle')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">{t('planner.introBody')}</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q.labelKey}
                    onClick={() => sendMessage(t(q.promptKey))}
                    className="text-xs font-semibold bg-card border border-border rounded-full px-3.5 py-2 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {t(q.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'w-full'}`}>
                    <div
                      className={`text-sm rounded-2xl px-4 py-2.5 ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : m.isError
                          ? 'bg-danger/10 text-danger rounded-bl-sm'
                          : 'bg-card border border-border text-foreground rounded-bl-sm'
                      }`}
                    >
                      {m.text}
                    </div>

                    {m.itinerary && (
                      <div className="mt-3 space-y-3">
                        {m.itinerary.days.map((day) => (
                          <div key={day.day}>
                            <p className="text-xs font-bold text-foreground mb-1.5">
                              {t('planner.dayLabel', { count: day.day })}
                              {day.destination ? ` · ${day.destination}` : ''}
                            </p>
                            <div className="space-y-2">{day.activities.map((a) => renderTourRow(fromActivity(a)))}</div>
                          </div>
                        ))}

                        {m.itinerary.notes.length > 0 && (
                          <div className="bg-surface-sand rounded-lg p-3">
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

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            <span className="font-bold text-foreground">{t('planner.estimatedCost')}:</span>{' '}
                            AZN {m.itinerary.estimatedCost}
                          </span>
                          <span>{t('planner.toursCount', { count: m.itinerary.toursCount })}</span>
                          <span>{t('planner.destinationsCount', { count: m.itinerary.destinationsCount })}</span>
                          <span>{t('planner.travelersSummary', { count: m.itinerary.travelers })}</span>
                        </div>

                        {token ? (
                          <button
                            onClick={() => handleSaveTrip(m.itinerary!, i)}
                            disabled={savedIndices.has(i)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary disabled:text-accent disabled:cursor-default"
                          >
                            {savedIndices.has(i) ? (
                              <>
                                <BookmarkCheck size={13} /> {t('planner.tripSaved')}
                              </>
                            ) : (
                              <>
                                <Bookmark size={13} /> {t('planner.saveTrip')}
                              </>
                            )}
                          </button>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t('planner.signInToSave')}</p>
                        )}
                      </div>
                    )}

                    {m.alternatives && m.alternatives.length > 0 && (
                      <div className="mt-3 space-y-2">{m.alternatives.map((alt) => renderTourRow(fromAlternative(alt)))}</div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <Loader2 size={14} className="animate-spin" /> {t('planner.thinking')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 p-4 border-t border-border shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length === 0 ? t('planner.inputPlaceholder') : t('planner.followUpPlaceholder')}
            disabled={sending}
            className="flex-1 text-sm bg-card border border-border rounded-full px-4 py-2.5 outline-none focus:border-primary disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            title={t('planner.send')}
            aria-label={t('planner.send')}
            className="flex items-center justify-center bg-accent text-accent-foreground rounded-full w-10 h-10 shrink-0 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
