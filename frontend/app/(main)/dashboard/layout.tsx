'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';

export default function OperatorAreaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, mode } = useAuth();
  const { loading } = useRequireAuth();
  const { t } = useLanguage();
  const canAccess = user?.account_type === 'operator' && mode === 'operator';

  useEffect(() => {
    if (!loading && user && !canAccess) router.replace('/');
  }, [loading, user, canAccess, router]);

  if (loading || !canAccess) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  return children;
}
