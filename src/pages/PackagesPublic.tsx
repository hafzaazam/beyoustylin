import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSalon } from '@/context/SalonContext';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Check, Clock, Crown, Sparkles } from 'lucide-react';

const PackagesPublic = () => {
  const { deals, services } = useSalon();

  const activeDeals = useMemo(() => deals.filter(d => d.status === 'active'), [deals]);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 px-4 lg:px-8 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
            <Crown className="w-3.5 h-3.5" />
            Bridal & Event Packages
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Complete <span className="text-primary italic">Packages</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            All-inclusive bridal and party bundles — every service you need for your special day, thoughtfully priced together.
          </p>
        </div>
      </section>

      {/* Packages grid */}
      <section className="py-16 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {activeDeals.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              No packages available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className={`relative p-8 rounded-3xl border-2 transition-all ${
                      isPopular
                        ? 'border-primary bg-primary/5 shadow-xl'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        Most Popular
                      </div>
                    )}
                    <h3 className="font-heading text-2xl font-bold mb-2">{d.name}</h3>
                    {d.description && (
                      <p className="text-sm text-muted-foreground mb-5">{d.description}</p>
                    )}

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-heading font-bold text-primary">
                        Rs. {d.discountedPrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">/ package</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center gap-2 mb-4 text-xs">
                        <span className="line-through text-muted-foreground">Rs. {originalTotal.toLocaleString()}</span>
                        <span className="text-primary font-semibold">Save Rs. {savings.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
                      <Clock className="w-3.5 h-3.5" />
                      ≈ {Math.round(d.totalDuration / 60)} hour session
                    </div>

                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                      What's included
                    </div>
                    <ul className="space-y-2.5 mb-8">
                      {items.map(svc =>
                        svc ? (
                          <li key={svc.id} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span>{svc.name}</span>
                          </li>
                        ) : null
                      )}
                    </ul>

                    <Link to="/#book" className="block">
                      <Button className="w-full" variant={isPopular ? 'default' : 'outline'}>
                        Book This Package
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl p-10 md:p-12 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Need a custom package?</h2>
          <p className="opacity-90 mb-6">Tell us about your event and budget — we'll craft a bespoke quote just for you.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/#book"><Button size="lg" variant="secondary" className="px-8">Request a Quote</Button></Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="px-8 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                Browse Services
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default PackagesPublic;
