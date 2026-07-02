import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSalon } from '@/context/SalonContext';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ArrowRight, Calendar, Check, Clock, Crown,
  Sparkles, Tag,
} from 'lucide-react';

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { services, deals } = useSalon();

  const service = useMemo(() => services.find(s => s.id === id), [services, id]);

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

  if (!service) {
    return (
      <PublicLayout>
        <section className="py-32 px-4 lg:px-8 text-center">
          <div className="max-w-lg mx-auto">
            <h1 className="font-heading text-3xl font-bold mb-3">Service not found</h1>
            <p className="text-muted-foreground mb-6">The service you're looking for doesn't exist or is no longer offered.</p>
            <Link to="/services"><Button>Browse all services</Button></Link>
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
      <section className="relative py-16 md:py-20 px-4 lg:px-8 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="max-w-5xl mx-auto">
          <Link to="/services" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> All services
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{service.category}</span>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {service.duration} min
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight mb-4">
            {service.name}
          </h1>
          <div className="flex flex-wrap items-baseline gap-3 mb-8">
            {service.price > 0 ? (
              <>
                <span className="text-4xl font-heading font-bold text-primary">Rs. {service.price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/ session</span>
              </>
            ) : (
              <span className="text-3xl font-heading font-bold text-primary">Price on Request</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={bookHref}>
              <Button size="lg" className="px-8">
                <Calendar className="w-4 h-4 mr-2" />
                Book This Service
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="px-8">Browse More</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="py-16 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            <div>
              <h2 className="font-heading text-2xl font-bold mb-3">About this service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Enjoy our signature <span className="text-foreground font-medium">{service.name.toLowerCase()}</span> —
                a {service.category.toLowerCase()} experience crafted by our expert team. Every session is personalised to
                your features, skin tone and preferences, using premium products for a flawless, long-lasting finish.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-bold mb-4">What's included</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {highlights.map(h => (
                  <li key={h.label} className="flex items-start gap-2.5 p-4 rounded-xl border border-border bg-card">
                    <h.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{h.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {relatedInDeals.length > 0 && (
              <div>
                <h2 className="font-heading text-2xl font-bold mb-4">Available in packages</h2>
                <div className="space-y-3">
                  {relatedInDeals.map(d => (
                    <Link
                      key={d.id}
                      to={`/?deal=${d.id}#book`}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Tag className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-heading font-semibold">{d.name}</div>
                          <div className="text-xs text-muted-foreground">≈ {Math.round(d.totalDuration / 60)} hours · Rs. {d.discountedPrice.toLocaleString()}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky booking card */}
          <aside className="md:sticky md:top-24 h-fit">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-primary font-medium mb-2">Ready to book</div>
              <h3 className="font-heading text-xl font-bold mb-1">{service.name}</h3>
              <div className="text-sm text-muted-foreground mb-5">{service.category}</div>

              <div className="flex justify-between items-center py-3 border-t border-border text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold text-primary">
                  {service.price > 0 ? `Rs. ${service.price.toLocaleString()}` : 'On Request'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-border text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">{service.duration} min</span>
              </div>

              <Link to={bookHref}>
                <Button className="w-full mt-5">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </Link>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Your service will be pre-selected on the booking form.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="pb-24 px-4 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl font-bold mb-6">More in {service.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map(s => (
                <Link
                  key={s.id}
                  to={`/services/${s.id}`}
                  className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-3 hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium w-fit">{s.category}</span>
                  <h3 className="font-heading text-lg font-semibold">{s.name}</h3>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <span className="text-primary font-bold">
                      {s.price > 0 ? `Rs. ${s.price.toLocaleString()}` : 'On Request'}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.duration} min</span>
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
