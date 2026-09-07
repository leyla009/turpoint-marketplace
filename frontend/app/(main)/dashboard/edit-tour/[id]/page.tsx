'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import NewTourContent, { type ExistingTour } from '../../../components/NewTourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Standalone route, reusing NewTourContent's exact form (same fields, same
// layout) in edit mode - pre-filled with the tour fetched below, PUT
// instead of POST on submit. Keeps its own ownership/loading/error
// handling since NewTourContent only knows how to render the form itself.
export default function EditTourPage() {
  const router = useRouter();
  const { id } = useParams();
  const { loading: authLoading } = useRequireAuth();
  const { operatorProfile } = useAuth();
  const { t } = useLanguage();

  const [loadingTour, setLoadingTour] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notOwner, setNotOwner] = useState(false);
  const [tour, setTour] = useState<ExistingTour | null>(null);

  useEffect(() => {
    if (!id || !operatorProfile) return;
    setLoadingTour(true);
    fetch(`${API_URL}/api/tours/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.id) {
          setLoadError(t('tourForm.tourNotFound'));
          return;
        }
        if (data.operator_id !== operatorProfile.id) {
          setNotOwner(true);
          return;
        }
        setTour(data);
      })
      .catch(() => setLoadError(t('tourForm.couldntReachBackend')))
      .finally(() => setLoadingTour(false));
  }, [id, operatorProfile]);

  if (authLoading || loadingTour) {
    return (
      <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> {t('dashboard.loading')}
      </div>
    );
  }

  if (loadError) {
    return <div className="p-6 text-sm text-muted-foreground">{loadError}</div>;
  }

  if (notOwner) {
    return <div className="p-6 text-sm text-muted-foreground">{t('tourForm.notYourTour')}</div>;
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-lg mx-auto pb-20 md:pb-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> {t('tourForm.backToDashboard')}
      </button>

      {tour && <NewTourContent tour={tour} onSuccess={() => router.push('/dashboard')} />}
    </div>
  );
}
