'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import LegalPage from '@/app/components/LegalPage';
import { CONTACT_EMAIL } from '@/app/lib/contact';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <LegalPage
      title={t('privacy.title')}
      intro={t('privacy.intro')}
      sections={[
        { title: t('privacy.section1Title'), body: t('privacy.section1Body') },
        { title: t('privacy.section2Title'), body: t('privacy.section2Body') },
        { title: t('privacy.section3Title'), body: t('privacy.section3Body') },
        { title: t('privacy.section4Title'), body: t('privacy.section4Body', { email: CONTACT_EMAIL }) },
      ]}
    />
  );
}
