'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Phone, AtSign } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface OperatorProfileModalOperator {
  name: string;
  rating?: number;
  description?: string | null;
  languages?: string | null;
  photo_url?: string | null;
  phone?: string | null;
  instagram?: string | null;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(rating) ? 'fill-rating text-rating' : 'text-border'} />
      ))}
    </div>
  );
}

// Full operator profile - everything an operator fills in on their own
// panel page (photo, description, languages, phone, Instagram) - opened
// by clicking the compact operator card on the tour detail page. Portaled
// to <body> for the same reason as the other
// floating modals (escapes the sticky-header stacking context).
export default function OperatorProfileModal({
  operator,
  onClose,
}: {
  operator: OperatorProfileModalOperator;
  onClose: () => void;
}) {
  const { t } = useLanguage();

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

  const languages = (operator.languages ?? '')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto relative shadow-2xl p-5"
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

        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-20 h-20 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-bold text-2xl shrink-0 mb-3">
            {operator.photo_url ? (
              <img
                src={`${API_URL}${operator.photo_url}`}
                alt={operator.name}
                className="w-full h-full object-cover"
              />
            ) : (
              operator.name.charAt(0).toUpperCase()
            )}
          </div>
          <h2
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {operator.name}
          </h2>
          {typeof operator.rating === 'number' && operator.rating > 0 ? (
            <div className="flex items-center gap-1.5 mt-1">
              <StarRow rating={operator.rating} />
              <span className="text-xs text-muted-foreground">{operator.rating.toFixed(1)}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{t('tourDetail.noRatingsYet')}</p>
          )}
        </div>

        {operator.description && (
          <p className="text-sm text-foreground/80 leading-relaxed mt-4">{operator.description}</p>
        )}

        {languages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {languages.map((lang) => (
              <span key={lang} className="text-[11px] bg-muted text-muted-foreground px-2 py-1 rounded-full">
                {lang}
              </span>
            ))}
          </div>
        )}

        {(operator.phone || operator.instagram) && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {operator.phone && (
              <a
                href={`tel:${operator.phone}`}
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Phone size={15} className="text-muted-foreground shrink-0" /> {operator.phone}
              </a>
            )}
            {operator.instagram && (
              <a
                href={`https://instagram.com/${operator.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <AtSign size={15} className="text-muted-foreground shrink-0" /> {operator.instagram}
              </a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
