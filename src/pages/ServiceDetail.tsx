import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSalon } from '@/context/SalonContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, formatPKR } from '@/lib/format';
import PublicLayout, { FavoriteButton } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ArrowRight, Calendar, Check, Clock, Crown,
  Sparkles, Tag,
} from 'lucide-react';

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { services, deals, loading } = useSalon();

  // Disabled services stay visible to staff in the admin panel, not on the public site.
  const service = useMemo(() => services.find(s => s.id === id && s.status === 'active'), [services, id]);
  usePageTitle(service?.name ?? (loading ? undefined : 'Service not found'));

  // Navigating between related services keeps the same component mounted.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  const relatedInDeals = useMemo(
    () => deals.filter(d => d.status === 'active' && d.serviceIds.includes(id || '')),
    [deals, id]
  );

  const related = useMemo(
    () => service
      ? services.filter(s => s.status === 'active' && s.category === service.category && s.id !== service.id).slice(0, 3)
      : [],
    [services, service]
  );

  if (!service && loading) {
    return (
      <PublicLayout>
        <section className="py-20 md:py-24 px-4 lg:px-8" aria-busy="true" aria-label="Loading service">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-3 w-24 bg-muted animate-pulse" />
            <div className="h-14 w-3/4 bg-muted animate-pulse" />
            <div className="h-10 w-40 bg-muted animate-pulse" />
          </div>
        </section>
      </PublicLayout>
    );
  }

  if (!service) {
    return (
      <PublicLayout>
        <section className="py-32 px-4 lg:px-8 text-center">
          <div className="max-w-lg mx-auto">
            <h1 className="font-heading text-4xl font-light mb-3">Service not found</h1>
            <p className="text-muted-foreground mb-6 font-light">The service you're looking for is no longer offered.</p>
            <Link to="/services"><Button className="rounded-none text-xs uppercase tracking-[0.2em]">Browse all services</Button></Link>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const bookHref = `/?service=${service.id}#book`;

  const highlights = [
    { icon: Sparkles, label: 'Premium products & tools' },
    { icon: Crown, label: 'Certified senior artists' },
    { icon: Clock, label: 'Punctual, on-schedule service' },
    { icon: Check, label: 'Hygienic single-use kit' },
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 md:py-24 px-4 lg:px-8 border-b border-border/60">
        <div className="max-w-5xl mx-auto">
          <Link to="/services" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-10">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.25} /> All services
          </Link>
          <div className="flex items-center gap-4 mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>{service.category}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span className="inline-flex items-center gap-1.5"><Clock className="w-3 h-3" strokeWidth={1.25} /> {formatDuration(service.duration)}</span>
          </div>
          <div className="flex items-start gap-3 mb-8">
            <h1 className="font-heading text-5xl md:text-7xl font-light tracking-tight leading-[1.02]">
              {service.name}
            </h1>
            <FavoriteButton type="service" id={service.id} name={service.name} className="mt-3" />
          </div>
          <div className="flex flex-wrap items-baseline gap-3 mb-10 pb-10 border-b border-border/60">
            {service.price > 0 ? (
              <>
                <span className="font-heading text-4xl md:text-5xl font-light text-foreground tabular-nums">{formatPKR(service.price)}</span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">/ session</span>
              </>
            ) : (
              <span className="font-heading text-3xl font-light text-foreground">Price on Request</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={bookHref}>
              <Button size="lg" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">
                <Calendar className="w-4 h-4 mr-2" strokeWidth={1.25} />
                Book this service
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Browse more</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="py-20 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-16">
          <div className="md:col-span-2 space-y-16">
            <div>
              <h2 className="font-heading text-3xl font-light tracking-tight mb-6">About this service.</h2>
              {service.description ? (
                <p className="text-muted-foreground leading-relaxed font-light whitespace-pre-line">{service.description}</p>
              ) : (
              <p className="text-muted-foreground leading-relaxed font-light">
                Enjoy our signature <span className="text-foreground italic">{service.name.toLowerCase()}</span>,
                a {service.category.toLowerCase()} experience crafted by our expert team. Every session is personalised
                to your features, skin tone and preferences, using premium products for a flawless, long-lasting finish.
              </p>
              )}
            </div>

            <div>
              <h2 className="font-heading text-3xl font-light tracking-tight mb-8">What's included.</h2>
              <ul className="grid sm:grid-cols-2 border-t border-l border-border/60">
                {highlights.map(h => (
                  <li key={h.label} className="flex items-start gap-3 p-5 border-r border-b border-border/60">
                    <h.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={1.25} />
                    <span className="text-sm font-light">{h.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {relatedInDeals.length > 0 && (
              <div>
                <h2 className="font-heading text-3xl font-light tracking-tight mb-8">Available in packages.</h2>
                <div className="border-t border-border/60">
                  {relatedInDeals.map(d => (
                    <Link
                      key={d.id}
                      to={`/?deal=${d.id}#book`}
                      className="flex items-center justify-between p-5 border-b border-border/60 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <Tag className="w-4 h-4 text-primary" strokeWidth={1.25} />
                        <div>
                          <div className="font-heading text-lg font-light">{d.name}</div>
                          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                            {formatDuration(d.totalDuration)} · {formatPKR(d.discountedPrice)}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.25} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky booking card */}
          <aside className="md:sticky md:top-24 h-fit">
            <div className="border border-border/60 p-8">
              <h3 className="font-heading text-2xl font-light tracking-tight mb-1">{service.name}</h3>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">{service.category}</div>

              <div className="flex justify-between items-center py-3 border-t border-border/60 text-sm">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Price</span>
                <span className="font-medium text-primary tabular-nums">
                  {service.price > 0 ? formatPKR(service.price) : 'On Request'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-border/60 text-sm">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Duration</span>
                <span className="font-medium tabular-nums">{formatDuration(service.duration)}</span>
              </div>

              <Link to={bookHref}>
                <Button className="w-full mt-6 rounded-none text-xs uppercase tracking-[0.2em]">
                  Book Now
                </Button>
              </Link>
              <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mt-4">
                Pre-selected on the form.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="pb-24 px-4 lg:px-8 border-t border-border/60 pt-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-light tracking-tight mb-10">More in {service.category.toLowerCase()}.</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-border/60">
              {related.map(s => (
                <Link
                  key={s.id}
                  to={`/services/${s.id}`}
                  className="group p-8 border-r border-b border-border/60 flex flex-col gap-4 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{s.category}</span>
                  <h3 className="font-heading text-2xl font-light tracking-tight group-hover:text-primary transition-colors">{s.name}</h3>
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/60">
                    <span className="text-primary font-medium text-sm tabular-nums">
                      {s.price > 0 ? formatPKR(s.price) : 'On Request'}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{formatDuration(s.duration)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
};

export default ServiceDetail;
