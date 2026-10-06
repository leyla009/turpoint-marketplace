'use client';

import { Fragment, ReactNode } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import {
  PRIVACY_EMAIL,
  PRIVACY_INTRO,
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
  type PolicyBlock,
} from '@/app/lib/privacyPolicy';

// Turns every occurrence of the privacy email inside a clause into a
// mailto link, so the content file can stay plain strings.
function withEmailLinks(text: string): ReactNode {
  const parts = text.split(PRIVACY_EMAIL);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <a href={`mailto:${PRIVACY_EMAIL}`} className="font-semibold text-primary underline underline-offset-2 hover:text-accent">
          {PRIVACY_EMAIL}
        </a>
      )}
    </Fragment>
  ));
}

function Block({ block }: { block: PolicyBlock }) {
  if (block.type === 'p') {
    return <p className="text-[15px] text-foreground/80 leading-[1.75]">{withEmailLinks(block.text)}</p>;
  }
  if (block.type === 'list') {
    return (
      <ul className="list-disc pl-5 space-y-2 marker:text-accent">
        {block.items.map((item) => (
          <li key={item} className="text-[15px] text-foreground/80 leading-[1.7] pl-1">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted">
          <tr>
            {block.head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-bold text-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {block.rows.map((row) => (
            <tr key={row[0]} className="align-top">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-4 py-3 leading-relaxed ${i === 0 ? 'font-semibold text-foreground min-w-[9rem]' : 'text-foreground/75 min-w-[12rem]'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  const { t, locale } = useLanguage();

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 pb-24 md:pt-14 md:pb-20 max-w-6xl mx-auto">
      <header className="max-w-3xl mb-10 md:mb-14">
        <h1
          className="text-[2.25rem] sm:text-[2.75rem] font-bold text-foreground leading-[1.15] mb-4"
        >
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: {PRIVACY_LAST_UPDATED}</p>
        <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">{PRIVACY_INTRO}</p>
        {locale !== 'en' && (
          <p className="mt-5 text-sm text-foreground/80 bg-surface-sand border border-border rounded-xl px-4 py-3">
            {t('privacy.englishOnly')}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr] gap-10 lg:gap-16">
        {/* Table of contents - sticky beside the text on wide screens,
            a compact box above it on smaller ones. */}
        <nav aria-label="Contents" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-surface-sand border border-border p-5">
            <p className="text-sm font-bold text-foreground mb-3">Contents</p>
            <ol className="space-y-1.5">
              {PRIVACY_SECTIONS.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors leading-snug py-0.5"
                  >
                    <span className="tabular-nums text-foreground/40 w-5 shrink-0">{i + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="max-w-3xl space-y-14">
          {PRIVACY_SECTIONS.map((section, i) => {
            const n = i + 1;
            return (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2
                  className="text-2xl sm:text-[1.75rem] font-bold text-foreground leading-[1.25] mb-5"
                >
                  <span className="text-accent mr-3 tabular-nums">{n}.</span>
                  {section.title}
                </h2>

                <aside className="rounded-xl bg-surface-moss border-l-4 border-primary px-5 py-4 mb-7">
                  <p className="text-sm font-bold text-primary mb-1">Summary</p>
                  <p className="text-[15px] text-foreground/85 leading-relaxed">{section.summary}</p>
                </aside>

                <div className="space-y-7">
                  {section.clauses.map((clause, j) => (
                    <div key={j}>
                      {clause.title ? (
                        <h3 className="text-base font-bold text-foreground mb-2.5">
                          <span className="tabular-nums text-muted-foreground mr-2">
                            {n}.{j + 1}
                          </span>
                          {clause.title}
                        </h3>
                      ) : null}
                      <div className="space-y-3.5">
                        {clause.blocks.map((block, k) => (
                          <Block key={k} block={block} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
