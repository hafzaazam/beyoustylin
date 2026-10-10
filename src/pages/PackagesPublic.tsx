import StudioIntro from '@/components/layout/StudioIntro';
import mehndiHero from '@/assets/mehndi-hero.jpg';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSalon } from '@/context/SalonContext';
import PublicLayout, { FavoriteButton } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Check, Clock } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, formatPKR } from '@/lib/format';
import Reveal from '@/components/Reveal';

const PackagesPublic = () => {
  const { deals, services, loading } = useSalon();
  usePageTitle('Packages');
  const activeDeals = useMemo(() => deals.filter(d => d.status === 'active'), [deals]);

  return (
    <PublicLayout polished>
      <StudioIntro title={<>Complete <em>packages.</em></>} image={mehndiHero} imageAlt={'Bridal mehndi artistry'} target="#package-menu" action="Find your package"><p>All-inclusive bridal and party bundles: every service you need for your special day, thoughtfully priced together.</p></StudioIntro>

      {/* Packages grid */}
      <Reveal as="section" id="package-menu" className="py-20 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px" aria-busy="true" aria-label="Loading packages">
              {[0, 1].map(i => <div key={i} className="h-96 bg-muted animate-pulse" />)}
            </div>
          ) : activeDeals.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground font-light">
              No packages available right now.
            </div>
          ) : (
            <div className="studio-package-grid">
              {activeDeals.map((d, idx) => {
                const isPopular = idx === 0;
                const items = d.serviceIds
                  .map(id => services.find(s => s.id === id))
                  .filter(Boolean);
                const originalTotal = items.reduce((sum, s) => sum + (s?.price || 0), 0);
                const savings = Math.max(0, originalTotal - d.discountedPrice);

                return (
                  <div
                    key={d.id}
                    className={`studio-package ${isPopular ? 'studio-package-featured' : ''}`}
                  >
                    {isPopular && (
                      <span className="absolute top-6 right-6 text-xs uppercase tracking-[0.25em] text-primary">
                        Most Popular
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-4 mb-8 pt-7">
                      <h3 className="font-heading text-3xl md:text-4xl font-light tracking-tight">{d.name}</h3>
                      <FavoriteButton type="deal" id={d.id} name={d.name} className="mt-2" />
                    </div>

                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-heading text-4xl font-light text-foreground tabular-nums">
                        {formatPKR(d.discountedPrice)}
                      </span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center gap-3 mb-4 text-xs uppercase tracking-widest">
                        <span className="line-through text-muted-foreground tabular-nums">{formatPKR(originalTotal)}</span>
                        <span className="text-primary tabular-nums">Save {formatPKR(savings)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-8">
                      <Clock className="w-3 h-3" strokeWidth={1.25} />
                      {formatDuration(d.totalDuration)} session
                    </div>

                    <div className="text-xs uppercase tracking-[0.18em] text-primary mb-4 font-medium pt-6 border-t border-border/60">
                      What's included
                    </div>
                    <ul className="space-y-3 mb-10 flex-1">
                      {items.map(svc =>
                        svc ? (
                          <li key={svc.id} className="flex items-start gap-3 text-sm text-muted-foreground font-light">
                            <Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" strokeWidth={1.5} />
                            <span>{svc.name}</span>
                          </li>
                        ) : null
                      )}
                    </ul>

                    <Link to={`/?deal=${d.id}#book`} className="block">
                      <Button className="w-full rounded-none text-xs uppercase tracking-[0.2em]" variant={isPopular ? 'default' : 'outline'}>
                        Book this package
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      {/* CTA */}
      <Reveal as="section" className="pb-24 px-4 lg:px-8 border-t border-border/60 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-4xl md:text-5xl font-light tracking-tight mb-4">Need a custom package?</h2>
          <p className="text-muted-foreground mb-8 font-light">Tell us about your event and budget and we'll craft a bespoke quote just for you.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/?mode=quote#book"><Button size="lg" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Request a quote</Button></Link>
            <Link to="/services"><Button size="lg" variant="outline" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Browse services</Button></Link>
          </div>
        </div>
      </Reveal>
    </PublicLayout>
  );
};

export default PackagesPublic;
