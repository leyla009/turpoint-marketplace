'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Sparkles, ArrowRight, Send, ChevronDown, ChevronUp,
  MapPin, Star, Clock, Users, Wallet, Bookmark, Check, AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_STYLE, CategoryMotif } from './TourCard';
import { AZERBAIJAN_CITIES } from '../lib/azerbaijanCities';
import type { TranslationKey } from '../lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type TravelStyle = 'relaxed' | 'balanced' | 'packed';
type Interest = 'nature' | 'history' | 'entertainment' | 'food';

interface Structured {
  origin: string;
  startDate: string;
  endDate: string;
  travelers: string;
  budgetMax: string;
  interests: Interest[];
  travelStyle: TravelStyle | '';
}

const EMPTY_STRUCTURED: Structured = {
  origin: '',
  startDate: '',
  endDate: '',
  travelers: '',
  budgetMax: '',
  interests: [],
  travelStyle: '',
};

interface Activity {
  tourId: number;
  title: string;
  location: string | null;
  category: string | null;
  durationDays: number;
  price: number;
  discountedPrice: number | null;
  rating: number | null;
  reviewCount: number;
  date: string | null;
  minParticipants: number;
  maxParticipants: number;
  reason: string;
}

interface ItineraryDay {
  day: number;
  destination: string | null;
  activities: Activity[];
}

interface Itinerary {
  tripSummary: string;
  travelerType: 'local' | 'international' | 'unspecified';
  travelers: number;
  days: ItineraryDay[];
  estimatedCost: number;
  toursCount: number;
  destinationsCount: number;
  notes: string[];
}

type Phase = 'clarify' | 'itinerary' | 'no_match' | 'error';

interface PlannerTurn {
  role: 'user' | 'assistant';
  content: string;
  phase?: Phase;
  itinerary?: Itinerary;
  alternatives?: any[];
}

const QUICK_STARTS: { labelKey: TranslationKey; promptKey: TranslationKey }[] = [
  { labelKey: 'planner.quickStartWeekend', promptKey: 'planner.quickStartWeekendPrompt' },
  { labelKey: 'planner.quickStartFirstTrip', promptKey: 'planner.quickStartFirstTripPrompt' },
  { labelKey: 'planner.quickStartNature', promptKey: 'planner.quickStartNaturePrompt' },
  { labelKey: 'planner.quickStartFood', promptKey: 'planner.quickStartFoodPrompt' },
  { labelKey: 'planner.quickStartFamily', promptKey: 'planner.quickStartFamilyPrompt' },
  { labelKey: 'planner.quickStartBudget', promptKey: 'planner.quickStartBudgetPrompt' },
];

const INTERESTS: Interest[] = ['nature', 'history', 'entertainment', 'food'];

// Smart Planner: a conversational, AI-assisted trip builder (see
// backend/src/routes/planner.js for the actual reasoning/matching flow).
// This component only ever renders tours the backend returns - it never
// invents a tour, price, or rating of its own; every recommendation here
// is a real TurPoint listing the visitor can open and book.
export default function PlannerModal({
  onClose,
  onViewTour,
  initialOrigin,
}: {
  onClose: () => void;
  onViewTour: (id: number) => void;
  /** Pre-fills the structured panel's "From" field with whatever the
   * homepage hero search card's own "Haradan?" field is currently set to,
   * so opening the planner from there doesn't throw away what the
   * traveler already told the site about their trip. */
  initialOrigin?: string;
}) {
  const { t, locale } = useLanguage();
  const { user, token } = useAuth();

  const [turns, setTurns] = useState<PlannerTurn[]>([]);
  const [input, setInput] = useState('');
  const [structured, setStructured] = useState<Structured>(() => ({
    ...EMPTY_STRUCTURED,
    origin: initialOrigin || '',
  }));
  const [showStructured, setShowStructured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [savedTripIds, setSavedTripIds] = useState<Set<number>>(new Set());
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const started = turns.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

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

  function toggleInterest(id: Interest) {
    setStructured((prev) => ({
      ...prev,
      interests: prev.interests.includes(id) ? prev.interests.filter((x) => x !== id) : [...prev.interests, id],
    }));
  }

  // Finds the most recent itinerary in the conversation, if any - sent
  // back to the backend so a follow-up like "make it cheaper" edits the
  // real plan instead of starting over from nothing.
  function lastItinerary(): Itinerary | undefined {
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.itinerary) return t.itinerary;
    }
    return undefined;
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setInput('');
    setNetworkError(false);
    const userTurn: PlannerTurn = { role: 'user', content: message };
    setTurns((prev) => [...prev, userTurn]);
    setLoading(true);

    const currentItinerary = lastItinerary();

    try {
      const res = await fetch(`${API_URL}/api/planner/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          locale,
          structured: {
            origin: structured.origin || undefined,
            startDate: structured.startDate || undefined,
            endDate: structured.endDate || undefined,
            travelers: structured.travelers ? Number(structured.travelers) : undefined,
            budgetMax: structured.budgetMax ? Number(structured.budgetMax) : undefined,
            interests: structured.interests.length ? structured.interests : undefined,
            travelStyle: structured.travelStyle || undefined,
          },
          history: [...turns, userTurn].slice(-8).map((t) => ({ role: t.role, content: t.content })),
          currentItinerary: currentItinerary ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('planner request failed');
      const data = await res.json();
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, phase: data.phase, itinerary: data.itinerary, alternatives: data.alternatives },
      ]);
    } catch {
      setNetworkError(true);
      setTurns((prev) => prev.slice(0, -1)); // drop the user turn that never got a reply, so retrying doesn't duplicate it
      setInput(message);
    } finally {
      setLoading(false);
    }
  }

  async function saveTrip(itinerary: Itinerary, index: number) {
    if (!token) return;
    setSavingIndex(index);
    try {
      const res = await fetch(`${API_URL}/api/planner/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: itinerary.tripSummary.slice(0, 60) || t('planner.title'), trip: itinerary }),
      });
      if (res.ok) setSavedTripIds((prev) => new Set(prev).add(index));
    } catch {
      // Save is a nice-to-have on top of an already-successful itinerary -
      // fail quietly rather than interrupting the trip the visitor is
      // actually looking at.
    } finally {
      setSavingIndex(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col relative shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
          <Sparkles size={17} className="text-accent" />
          <h2
            className="text-base sm:text-lg font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('planner.title')}
          </h2>
          <div className="flex-1" />
          {started && (
            <button
              onClick={() => {
                setTurns([]);
                setStructured(EMPTY_STRUCTURED);
              }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground mr-1"
            >
              {t('planner.newTrip')}
            </button>
          )}
          <button
            onClick={onClose}
            title={t('map.close')}
            aria-label={t('map.close')}
            className="bg-muted hover:bg-border text-foreground rounded-full p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!started ? (
            <PlannerLanding
              structured={structured}
              setStructured={setStructured}
              showStructured={showStructured}
              setShowStructured={setShowStructured}
              toggleInterest={toggleInterest}
              onSend={send}
            />
          ) : (
            <div className="px-5 py-5 space-y-5">
              {turns.map((turn, i) =>
                turn.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] bg-primary text-primary-foreground text-sm rounded-2xl rounded-tr-sm px-4 py-2.5">
                      {turn.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="space-y-3">
                    {turn.phase === 'error' && (
                      <div className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        {turn.content}
                      </div>
                    )}
                    {turn.phase !== 'error' && turn.content && (
                      <p className="text-sm text-foreground max-w-[90%] leading-relaxed">{turn.content}</p>
                    )}
                    {turn.itinerary && (
                      <ItineraryView
                        itinerary={turn.itinerary}
                        onViewTour={onViewTour}
                        canSave={!!user}
                        saved={savedTripIds.has(i)}
                        saving={savingIndex === i}
                        onSave={() => saveTrip(turn.itinerary!, i)}
                      />
                    )}
                    {turn.alternatives && turn.alternatives.length > 0 && (
                      <AlternativesView tours={turn.alternatives} onViewTour={onViewTour} />
                    )}
                  </div>
                )
              )}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
                  </span>
                  {t('planner.thinking')}
                </div>
              )}
              {networkError && (
                <p className="flex items-center gap-2 text-sm text-danger">
                  <AlertCircle size={15} className="shrink-0" /> {t('planner.networkError')}
                </p>
              )}
            </div>
          )}
        </div>

        {started && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="shrink-0 border-t border-border p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('planner.followUpPlaceholder')}
              disabled={loading}
              className="flex-1 text-sm bg-muted rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={t('planner.send')}
              className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

function PlannerLanding({
  structured,
  setStructured,
  showStructured,
  setShowStructured,
  toggleInterest,
  onSend,
}: {
  structured: Structured;
  setStructured: (fn: (prev: Structured) => Structured) => void;
  showStructured: boolean;
  setShowStructured: (v: boolean) => void;
  toggleInterest: (id: Interest) => void;
  onSend: (text: string) => void;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState('');

  // The landing view builds its own first message from the free-text box,
  // falling back to a plain "label: value" summary of whatever structured
  // fields are set when the box is left empty - built entirely from
  // already-localized field labels (not a hardcoded English sentence), so
  // a visitor who only used the structured panel still sees their own
  // chat bubble in their own language, not raw English.
  function structuredSummary(): string {
    const parts: string[] = [];
    if (structured.origin) parts.push(`${t('planner.originLabel')}: ${structured.origin}`);
    if (structured.startDate) {
      parts.push(`${t('planner.datesLabel')}: ${structured.startDate}${structured.endDate ? ` – ${structured.endDate}` : ''}`);
    }
    if (structured.travelers) parts.push(`${t('planner.travelersLabel')}: ${structured.travelers}`);
    if (structured.budgetMax) parts.push(`${t('planner.budgetMaxLabel')}: ${structured.budgetMax}`);
    if (structured.interests.length) {
      parts.push(`${t('planner.interestsLabel')}: ${structured.interests.map((i) => t(CATEGORY_STYLE[i].labelKey)).join(', ')}`);
    }
    if (structured.travelStyle) {
      parts.push(
        `${t('planner.travelStyleLabel')}: ${t(
          structured.travelStyle === 'relaxed'
            ? 'planner.travelStyleRelaxed'
            : structured.travelStyle === 'packed'
            ? 'planner.travelStylePacked'
            : 'planner.travelStyleBalanced'
        )}`
      );
    }
    return parts.join(' · ');
  }

  return (
    <div className="px-5 py-6">
      <h3
        className="text-lg sm:text-xl font-bold text-foreground mb-1.5"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {t('planner.introTitle')}
      </h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{t('planner.introBody')}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim() || structuredSummary();
          if (text) onSend(text);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('planner.inputPlaceholder')}
          rows={3}
          autoFocus
          className="w-full text-sm bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-3"
        />
        <button
          type="submit"
          disabled={!input.trim() && structuredSummary() === ''}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl py-3 hover:opacity-90 disabled:opacity-40 transition-opacity mb-5"
        >
          <Sparkles size={15} />
          {t('planner.buildTrip')}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {QUICK_STARTS.map(({ labelKey, promptKey }) => (
          <button
            key={labelKey}
            type="button"
            onClick={() => onSend(t(promptKey))}
            className="text-xs font-semibold bg-card border border-border text-foreground rounded-full px-3.5 py-1.5 hover:border-primary/40 transition-colors"
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowStructured(!showStructured)}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3"
      >
        {showStructured ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {t('planner.moreOptions')}
      </button>

      {showStructured && (
        <div className="bg-background border border-border rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('planner.originLabel')}>
              <input
                type="text"
                list="planner-cities"
                value={structured.origin}
                onChange={(e) => setStructured((p) => ({ ...p, origin: e.target.value }))}
                placeholder={t('planner.originPlaceholder')}
                className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none"
              />
              <datalist id="planner-cities">
                {AZERBAIJAN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label={t('planner.travelersLabel')}>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-muted-foreground shrink-0" />
                <input
                  type="number"
                  min={1}
                  value={structured.travelers}
                  onChange={(e) => setStructured((p) => ({ ...p, travelers: e.target.value }))}
                  placeholder="1"
                  className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none"
                />
              </div>
            </Field>
            <Field label={t('planner.datesLabel')}>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={structured.startDate}
                  onChange={(e) => setStructured((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full text-sm bg-card border border-border rounded-lg px-2.5 py-2 text-foreground outline-none"
                />
                <input
                  type="date"
                  value={structured.endDate}
                  onChange={(e) => setStructured((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full text-sm bg-card border border-border rounded-lg px-2.5 py-2 text-foreground outline-none"
                />
              </div>
            </Field>
            <Field label={t('planner.budgetMaxLabel')}>
              <div className="flex items-center gap-1.5">
                <Wallet size={14} className="text-muted-foreground shrink-0" />
                <input
                  type="number"
                  min={1}
                  value={structured.budgetMax}
                  onChange={(e) => setStructured((p) => ({ ...p, budgetMax: e.target.value }))}
                  placeholder="300"
                  className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none"
                />
              </div>
            </Field>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-1.5">{t('planner.travelStyleLabel')}</p>
            <div className="flex bg-muted rounded-lg p-1">
              {(['relaxed', 'balanced', 'packed'] as TravelStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setStructured((p) => ({ ...p, travelStyle: p.travelStyle === style ? '' : style }))}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
                    structured.travelStyle === style ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t(
                    style === 'relaxed'
                      ? 'planner.travelStyleRelaxed'
                      : style === 'packed'
                      ? 'planner.travelStylePacked'
                      : 'planner.travelStyleBalanced'
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-1.5">{t('planner.interestsLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const style = CATEGORY_STYLE[interest];
                const Icon = style.Icon;
                const active = structured.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/30'
                    }`}
                  >
                    <Icon size={12} />
                    {t(style.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function ItineraryView({
  itinerary,
  onViewTour,
  canSave,
  saved,
  saving,
  onSave,
}: {
  itinerary: Itinerary;
  onViewTour: (id: number) => void;
  canSave: boolean;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm font-bold text-foreground">{t('planner.toursCount', { count: itinerary.toursCount })}</span>
        <span className="text-sm text-muted-foreground">{t('planner.destinationsCount', { count: itinerary.destinationsCount })}</span>
        <span className="text-sm text-muted-foreground">{t('planner.travelersSummary', { count: itinerary.travelers })}</span>
        <div className="flex-1" />
        <span className="text-sm font-bold text-primary">
          {t('planner.estimatedCost')}: {itinerary.estimatedCost} AZN
        </span>
      </div>

      <div className="divide-y divide-border">
        {itinerary.days.map((day) => (
          <div key={day.day} className="px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-accent mb-2">
              Day {day.day}
              {day.destination ? ` · ${day.destination}` : ''}
            </p>
            <div className="space-y-2.5">
              {day.activities.map((a) => (
                <ActivityCard key={a.tourId} activity={a} onViewTour={onViewTour} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {itinerary.notes.length > 0 && (
        <div className="px-4 py-3.5 bg-muted/50 border-t border-border">
          <p className="text-xs font-bold text-foreground mb-1.5">{t('planner.notesTitle')}</p>
          <ul className="space-y-1">
            {itinerary.notes.map((n, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 py-3.5 border-t border-border">
        {canSave ? (
          <button
            onClick={onSave}
            disabled={saved || saving}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 disabled:opacity-60"
          >
            {saved ? <Check size={13} /> : <Bookmark size={13} />}
            {saved ? t('planner.tripSaved') : saving ? '…' : t('planner.saveTrip')}
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">{t('planner.signInToSave')}</p>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ activity, onViewTour }: { activity: Activity; onViewTour: (id: number) => void }) {
  const { t } = useLanguage();
  const style = CATEGORY_STYLE[activity.category ?? ''] ?? CATEGORY_STYLE.history;
  const hasRating = typeof activity.rating === 'number' && activity.rating > 0;
  const effectivePrice = activity.discountedPrice ?? activity.price;

  return (
    <button
      onClick={() => onViewTour(activity.tourId)}
      className="w-full text-left flex gap-3 bg-card border border-border rounded-xl p-2.5 hover:border-primary/30 transition-colors group"
    >
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
        <CategoryMotif category={activity.category} />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-foreground truncate">{activity.title}</h4>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-0.5">
          {activity.location && (
            <span className="flex items-center gap-0.5">
              <MapPin size={10} /> {activity.location}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock size={10} /> {t('tourDetail.duration', { count: activity.durationDays })}
          </span>
          {hasRating && (
            <span className="flex items-center gap-0.5">
              <Star size={10} className="fill-rating text-rating" /> {activity.rating!.toFixed(1)}
            </span>
          )}
        </div>
        {activity.reason && <p className="text-[11px] text-muted-foreground/80 italic mt-1 line-clamp-1">{activity.reason}</p>}
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <span className="text-sm font-bold text-foreground">{effectivePrice} AZN</span>
        <ArrowRight size={13} className="text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
    </button>
  );
}

function AlternativesView({ tours, onViewTour }: { tours: any[]; onViewTour: (id: number) => void }) {
  return (
    <div className="space-y-2">
      {tours.map((tour) => (
        <ActivityCard
          key={tour.id}
          activity={{
            tourId: tour.id,
            title: tour.title,
            location: tour.location,
            category: tour.category,
            durationDays: tour.duration_days,
            price: tour.price,
            discountedPrice: tour.discounted_price ?? null,
            rating: tour.rating,
            reviewCount: tour.review_count,
            date: tour.date,
            minParticipants: tour.min_participants,
            maxParticipants: tour.max_participants,
            reason: '',
          }}
          onViewTour={onViewTour}
        />
      ))}
    </div>
  );
}
