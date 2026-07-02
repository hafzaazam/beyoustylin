import { Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { useSalon } from '@/context/SalonContext';
import { useFavorites } from '@/hooks/useFavorites';

const AccountFavorites = () => {
  const { services, deals } = useSalon();
  const { favorites, toggle, loading } = useFavorites();

  const favServices = services.filter(s => favorites.some(f => f.service_id === s.id));
  const favDeals = deals.filter(d => favorites.some(f => f.deal_id === d.id));

  const isEmpty = !loading && favServices.length === 0 && favDeals.length === 0;

  return (
    <CustomerLayout title="Favorites" subtitle="Your saved menu">
      {isEmpty ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <Heart className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-heading text-xl font-semibold mb-1">No favorites yet</p>
          <p className="text-sm text-muted-foreground mb-4">Tap the heart on any service or package to save it here.</p>
          <div className="flex justify-center gap-2">
            <Link to="/services" className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90">Browse services</Link>
            <Link to="/packages" className="text-sm font-medium px-4 py-2 rounded-full bg-muted hover:bg-muted/70">Bridal packages</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {favServices.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">Services</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favServices.map(s => (
                  <div key={s.id} className="rounded-2xl border border-border/60 bg-card/80 p-5 hover:shadow-[0_12px_30px_-16px_hsl(328_85%_55%/0.3)] transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{s.category}</p>
                        <h3 className="font-heading text-lg font-semibold">{s.name}</h3>
                      </div>
                      <button onClick={() => toggle('service', s.id)} className="text-primary hover:scale-110 transition-transform">
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-heading text-xl font-bold text-primary">{s.price ? `Rs. ${s.price.toLocaleString()}` : 'On request'}</span>
                      <Link to={`/services/${s.id}`} className="text-xs font-semibold text-primary hover:underline">View →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {favDeals.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">Packages</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {favDeals.map(d => (
                  <div key={d.id} className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-accent/10 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-primary mb-1">
                          <Sparkles className="w-3 h-3" /> Package
                        </div>
                        <h3 className="font-heading text-lg font-semibold">{d.name}</h3>
                      </div>
                      <button onClick={() => toggle({ dealId: d.id })} className="text-primary hover:scale-110 transition-transform">
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{d.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-xl font-bold text-primary">Rs. {d.price.toLocaleString()}</span>
                      <Link to={`/?deal=${d.id}#book`} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90">Book</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </CustomerLayout>
  );
};

export default AccountFavorites;
