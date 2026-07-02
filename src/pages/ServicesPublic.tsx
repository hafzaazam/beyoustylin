import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSalon } from '@/context/SalonContext';
import PublicLayout from '@/components/layout/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, Search, Sparkles, ArrowRight } from 'lucide-react';

const ServicesPublic = () => {
  const { services } = useSalon();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('All');

  const activeServices = useMemo(
    () => services.filter(s => s.status === 'active'),
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
    const map = new Map<string, typeof filtered>();
    filtered.forEach(s => {
      if (!map.has(s.category)) map.set(s.category, [] as any);
      map.get(s.category)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 px-4 lg:px-8 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Signature Beauty Menu
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Our <span className="text-primary italic">Services</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our complete menu of makeup, hair, skincare and mehndi services — thoughtfully priced and crafted to make you feel iconic.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 lg:px-8 -mt-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row gap-4 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                    activeCat === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
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
        <div className="max-w-7xl mx-auto space-y-14">
          {grouped.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              No services match your search.
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">Category</p>
                    <h2 className="font-heading text-3xl font-bold">{category}</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">{items.length} service{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map(s => (
                    <div key={s.id} className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-3 hover:shadow-md hover:border-primary/40 transition-all">
                      <div className="flex items-start justify-between">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s.category}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {s.duration} min
                        </span>
                      </div>
                      <h3 className="font-heading text-lg font-semibold">{s.name}</h3>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                        <span className="text-primary font-bold text-lg">
                          {s.price > 0 ? `Rs. ${s.price.toLocaleString()}` : 'On Request'}
                        </span>
                        <Link to="/#book" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                          Book <ArrowRight className="w-3 h-3" />
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
      <section className="pb-24 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl p-10 md:p-12 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Ready to book a session?</h2>
          <p className="opacity-90 mb-6">Reserve your appointment or ask our team for a personalised quote.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/#book"><Button size="lg" variant="secondary" className="px-8">Book Appointment</Button></Link>
            <Link to="/packages">
              <Button size="lg" variant="outline" className="px-8 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                View Packages
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ServicesPublic;
