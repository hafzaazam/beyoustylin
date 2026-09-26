import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSalon } from '@/context/SalonContext';
import PublicLayout, { FavoriteButton } from '@/components/layout/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, Search, ArrowRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, formatPKR } from '@/lib/format';
import { Service } from '@/types/salon';

const ServicesPublic = () => {
  const { services, loading } = useSalon();
  usePageTitle('Services');
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('All');

  const activeServices = useMemo(
    () => services.filter(s => s.status === 'active' && s.category.toLowerCase() !== 'mehndi'),
    [services]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeServices.forEach(s => set.add(s.category));
    return ['All', ...Array.from(set).sort()];
  }, [activeServices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeServices.filter(s => {
      if (activeCat !== 'All' && s.category !== activeCat) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeServices, query, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    filtered.forEach(s => {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-24 px-4 lg:px-8 border-b border-border/60">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-heading text-5xl md:text-7xl font-light tracking-tight mb-6">
            Our <span className="italic text-primary">services.</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-xl font-light leading-relaxed">
            Explore our complete menu of makeup, hair and skincare, thoughtfully priced and crafted.
            Looking for mehndi? See our <Link to="/mehndi" className="text-primary hover:underline">mehndi menu</Link>.
          </p>
        </div>
      </section>


      {/* Filters */}
      <section className="px-4 lg:px-8 pt-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 md:items-center pb-6 border-b border-border/60">
            <div className="relative flex-1">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.25} />
              <Input
                placeholder="Search services..."
                aria-label="Search services"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-7 rounded-none border-0 border-b border-transparent focus-visible:ring-0 focus-visible:border-primary/60 bg-transparent"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  aria-pressed={activeCat === c}
                  className={`px-3 py-1.5 text-xs uppercase tracking-[0.2em] whitespace-nowrap border-b transition-colors ${
                    activeCat === c
                      ? 'text-foreground border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Services grid */}
      <section className="py-16 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-20">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" aria-busy="true" aria-label="Loading services">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse" />)}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground font-light">
              {activeServices.length === 0 ? 'Our service menu is being updated. Please check back soon.' : 'No services match your search.'}
              {(query || activeCat !== 'All') && activeServices.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => { setQuery(''); setActiveCat('All'); }}
                    className="text-xs uppercase tracking-[0.2em] text-primary hover:text-primary"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <div className="flex items-end justify-between mb-8 pb-6 border-b border-border/60">
                  <div>
                    <h2 className="font-heading text-3xl md:text-4xl font-light tracking-tight">{category}</h2>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums">
                    {String(items.length).padStart(2, '0')} · service{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-border/60">
                  {items.map(s => (
                    <div key={s.id} className="group p-8 border-r border-b border-border/60 flex flex-col gap-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{s.category}</span>
                        <span className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.25} /> {formatDuration(s.duration)}
                          <FavoriteButton type="service" id={s.id} name={s.name} className="-my-1.5 -mr-1.5 ml-1" />
                        </span>
                      </div>
                      <Link to={`/services/${s.id}`} className="font-heading text-2xl font-light tracking-tight hover:text-primary transition-colors">
                        {s.name}
                      </Link>
                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/60">
                        <span className="text-primary font-medium text-sm tabular-nums">
                          {s.price > 0 ? formatPKR(s.price) : 'On Request'}
                        </span>
                        <Link to={`/?service=${s.id}#book`} className="text-xs uppercase tracking-[0.2em] text-foreground/70 group-hover:text-primary transition-colors inline-flex items-center gap-1.5">
                          Book <ArrowRight className="w-3 h-3" strokeWidth={1.25} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 lg:px-8 border-t border-border/60 pt-24 mt-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-4xl md:text-5xl font-light tracking-tight mb-4">Ready to book a session?</h2>
          <p className="text-muted-foreground mb-8 font-light">Reserve your appointment or ask our team for a personalised quote.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/#book"><Button size="lg" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Book Appointment</Button></Link>
            <Link to="/packages"><Button size="lg" variant="outline" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">View Packages</Button></Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
};

export default ServicesPublic;
