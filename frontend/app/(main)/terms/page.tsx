'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { TERMS_INTRO, TERMS_LAST_UPDATED, TERMS_READER_NOTE, TERMS_SECTIONS } from '@/app/lib/termsOfUse';

export default function TermsPage() {
  const { locale } = useLanguage();

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 pb-24 md:pt-14 md:pb-20 max-w-6xl mx-auto">
      <header className="max-w-3xl mb-10 md:mb-14">
        <h1 className="text-[2.25rem] sm:text-[2.75rem] font-bold text-foreground leading-[1.15] mb-4">
          Terms of Use
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: {TERMS_LAST_UPDATED}</p>
        <div className="space-y-3 text-base sm:text-lg text-foreground/80 leading-relaxed">
          <p>{TERMS_INTRO}</p>
          <p>{TERMS_READER_NOTE}</p>
        </div>
        {locale !== 'en' && (
          <p className="mt-5 text-sm text-foreground/80 bg-surface-sand border border-border rounded-xl px-4 py-3">
            {locale === 'az'
              ? 'İstifadə şərtlərinin hüquqi mətni hazırda yalnız ingilis dilindədir.'
              : 'Юридический текст условий использования пока доступен только на английском языке.'}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr] gap-10 lg:gap-16">
        <nav aria-label="Contents" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-surface-sand border border-border p-5">
            <p className="text-sm font-bold text-foreground mb-3">Contents</p>
            <ol className="space-y-1.5">
              {TERMS_SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors leading-snug py-0.5"
                  >
                    <span className="tabular-nums text-foreground/40 w-5 shrink-0">{index + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <main className="max-w-3xl space-y-14">
          {TERMS_SECTIONS.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-2xl sm:text-[1.75rem] font-bold text-foreground leading-[1.25] mb-5">
                <span className="text-accent mr-3 tabular-nums">{index + 1}.</span>
                {section.title}
              </h2>

              <div className="space-y-4">
                {section.blocks.map((block, blockIndex) =>
                  block.type === 'paragraph' ? (
                    <p key={blockIndex} className="text-[15px] text-foreground/80 leading-[1.75]">
                      {block.text}
                    </p>
                  ) : (
                    <ul key={blockIndex} className="list-disc pl-5 space-y-2 marker:text-accent">
                      {block.items.map((item) => (
                        <li key={item} className="text-[15px] text-foreground/80 leading-[1.7] pl-1">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
