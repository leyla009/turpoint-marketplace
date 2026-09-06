'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useRequireAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import NewTourContent from '../../components/NewTourContent';

// Standalone route so the form is still reachable via direct link,
// bookmark, or refresh. From the panel page, "+ Tur əlavə et" instead
// opens this same form inside NewTourModal as a popup - see
// components/NewTourContent.tsx.
export default function NewTourPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { t } = useLanguage();

  if (authLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-lg mx-auto pb-20 md:pb-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> {t('tourForm.backToDashboard')}
      </button>

      <NewTourContent onSuccess={() => router.push('/dashboard')} />
    </div>
  );
}
