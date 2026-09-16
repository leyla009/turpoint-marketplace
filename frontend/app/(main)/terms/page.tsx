'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import LegalPage from '@/app/components/LegalPage';

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <LegalPage
      title={t('terms.title')}
      intro={t('terms.intro')}
      sections={[
        { title: t('terms.section1Title'), body: t('terms.section1Body') },
        { title: t('terms.section2Title'), body: t('terms.section2Body') },
        { title: t('terms.section3Title'), body: t('terms.section3Body') },
        { title: t('terms.section4Title'), body: t('terms.section4Body') },
      ]}
    />
  );
}
