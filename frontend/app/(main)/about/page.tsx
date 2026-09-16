'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import PageContainer from '@/app/components/PageContainer';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <PageContainer maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">{t('about.title')}</h1>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{t('about.subtitle')}</p>
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
        <p>{t('about.p3')}</p>
      </div>
    </PageContainer>
  );
}
