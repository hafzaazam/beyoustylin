import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/layout/PublicLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { POLICY, SITE } from '@/config/site';
import { LEGAL_LINKS } from '@/config/legal';
import { formatDate } from '@/lib/format';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Shared shell for the policy pages: hero, table of contents, numbered sections, contact footer. */
const LegalPage = ({ eyebrow, title, intro, sections }: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) => {
  usePageTitle(title);

  return (
    <PublicLayout>
      <section className="py-20 md:py-24 px-4 lg:px-8 border-b border-border/60">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80 mb-6 font-medium">{eyebrow}</p>
          <h1 className="font-heading text-4xl md:text-6xl font-light tracking-tight mb-6">{title}</h1>
          <div className="text-base text-muted-foreground max-w-2xl font-light leading-relaxed">{intro}</div>
          <p className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground">
            Last updated {formatDate(POLICY.lastUpdated)}
          </p>
        </div>
      </section>

      <section className="py-16 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-12">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 h-fit">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-4 font-medium">On this page</p>
            <ol className="space-y-2.5 text-sm text-muted-foreground font-light">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="hover:text-foreground transition-colors">
                    <span className="tabular-nums text-primary/70 mr-2">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-prose">
            {sections.map((s, i) => (
              <article key={s.id} id={s.id} className="scroll-mt-24 pb-10 mb-10 border-b border-border/60 last:border-0">
                <h2 className="font-heading text-2xl md:text-3xl font-light tracking-tight mb-5">
                  <span className="tabular-nums text-primary/70 mr-3 text-xl">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <div className="space-y-4 text-sm md:text-[15px] text-muted-foreground font-light leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-foreground [&_strong]:font-normal [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
                  {s.body}
                </div>
              </article>
            ))}

            <div className="border border-border/60 p-8 bg-muted/30">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-3 font-medium">Questions?</p>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Email <a href={`mailto:${SITE.email}`} className="text-primary underline underline-offset-4">{SITE.email}</a> or
                call <a href={SITE.phoneHref} className="text-primary underline underline-offset-4">{SITE.phoneDisplay}</a> ({SITE.hours}).
              </p>
              <p className="mt-4 text-xs text-muted-foreground font-light">
                See also:{' '}
                {LEGAL_LINKS.filter(l => l.label !== title).map((l, i) => (
                  <span key={l.to}>
                    {i > 0 && ' · '}
                    <Link to={l.to} className="hover:text-foreground underline underline-offset-4">{l.label}</Link>
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default LegalPage;
