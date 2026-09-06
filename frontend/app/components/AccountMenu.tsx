'use client';

import { useEffect, useRef } from 'react';
import { User as UserIcon, Ticket, History, LogOut, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';

export type AccountSection = 'info' | 'documents' | 'bookings' | 'history';

const ITEMS: { id: AccountSection; labelKey: TranslationKey; Icon: any }[] = [
  { id: 'info', labelKey: 'account.personalInfo', Icon: UserIcon },
  { id: 'documents', labelKey: 'account.myDocuments', Icon: FileText },
  { id: 'bookings', labelKey: 'account.myBookings', Icon: Ticket },
  { id: 'history', labelKey: 'account.history', Icon: History },
];

// Small anchored dropdown ("pocket") that appears right under the avatar
// when it's clicked - just a 3-row menu, not a container for the actual
// content. Picking a row closes this and opens that section's own
// focused modal (AccountDetailModal). Not portaled - it's small and lives
// right next to its trigger, so it doesn't need to escape any stacking
// context the way a full-screen modal does.
export default function AccountMenu({
  onSelect,
  onClose,
  onLogout,
  anchor = 'below',
}: {
  onSelect: (section: AccountSection) => void;
  onClose: () => void;
  onLogout: () => void;
  anchor?: 'below' | 'above';
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute ${
        anchor === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
      } right-0 w-56 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50`}
    >
      {ITEMS.map(({ id, labelKey, Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
        >
          <Icon size={15} className="text-muted-foreground shrink-0" />
          {t(labelKey)}
        </button>
      ))}
      <div className="mt-1 pt-1 px-1.5 border-t border-border">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm font-semibold text-danger bg-danger/10 hover:bg-danger/15 transition-colors text-left"
        >
          <LogOut size={15} className="shrink-0" />
          {t('nav.logOut')}
        </button>
      </div>
    </div>
  );
}
