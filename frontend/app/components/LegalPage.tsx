import PageContainer from './PageContainer';

// Shared layout for the terms/privacy pages - title, one intro paragraph,
// then a list of heading+body sections. Kept generic (plain strings, not
// translation keys) so the two pages just pass in already-translated text.
export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: { title: string; body: string }[];
}) {
  return (
    <PageContainer maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{intro}</p>
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-base font-bold text-foreground mb-1.5">{section.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
