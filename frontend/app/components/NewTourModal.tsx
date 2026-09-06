'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import NewTourContent from './NewTourContent';

// "+ Tur əlavə et" opened as a popup directly on the panel page, instead of
// navigating to /dashboard/new-tour - portaled to <body> for the same
// reason as the other floating modals (escapes the sticky-header stacking
// context). onCreated fires after a successful publish so the panel can
// close this and refresh its tour list.
export default function NewTourModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto relative shadow-2xl p-5"
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

        <NewTourContent onSuccess={onCreated} />
      </div>
    </div>,
    document.body
  );
}
