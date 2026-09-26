import { createContext, ReactNode, useContext, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Instagram, Facebook, MapPin, Phone, Mail, Menu, Clock, Heart } from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { SITE } from '@/config/site';

const navLinks = [
  { to: '/services', label: 'Services' },
  { to: '/packages', label: 'Packages' },
  { to: '/mehndi', label: 'Mehndi' },
  { to: '/#book', label: 'Book' },
  { to: '/#about', label: 'About' },
  { to: '/#contact', label: 'Contact' },
];

/** "Sign in" for visitors, "My account" for customers, "Dashboard" for staff. */
export const AccountButton = ({ className = '' }: { className?: string }) => {
  const { user, isStaff, rolesLoaded } = useAuth();
  const target = !user ? '/auth' : isStaff ? '/admin' : '/account';
  const label = !user ? 'Sign in' : !rolesLoaded ? 'Account' : isStaff ? 'Dashboard' : 'My account';
  return (
    <Link to={target} className={className}>
      <Button size="sm" variant="outline" className="rounded-none text-[10px] uppercase tracking-[0.2em] w-full">{label}</Button>
    </Link>
  );
};

// One favorites fetch per page, shared by every heart button inside the layout.
const FavoritesContext = createContext<ReturnType<typeof useFavorites> | null>(null);

/** Heart toggle for saving a service or package to the customer's favorites. Render inside PublicLayout. */
export const FavoriteButton = ({ type, id, name, className = '' }: { type: 'service' | 'deal'; id: string; name: string; className?: string }) => {
  const { isStaff } = useAuth();
  const favorites = useContext(FavoritesContext);
  const navigate = useNavigate();
  const location = useLocation();
  if (isStaff || !favorites) return null; // favorites are a customer feature
  const { isFavorite, toggle } = favorites;
  const saved = isFavorite(type, id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
      title={saved ? 'Saved to favorites' : 'Save to favorites'}
      className={`p-1.5 text-primary/80 hover:text-primary hover:scale-110 transition ${className}`}
      onClick={async e => {
        e.preventDefault();
        e.stopPropagation();
        const { requiresAuth } = await toggle(type, id);
        if (requiresAuth) {
          toast.info('Sign in to save favorites.');
          navigate('/auth', { state: { from: location.pathname } });
        } else {
          toast.success(saved ? 'Removed from favorites' : 'Saved to favorites');
        }
      }}
    >
      <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} strokeWidth={1.5} />
    </button>
  );
};

const SocialLinks = () => (
  <>
    {SITE.instagramUrl && (
      <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
        <Instagram className="w-4 h-4" strokeWidth={1.25} />
      </a>
    )}
    {SITE.facebookUrl && (
      <a href={SITE.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
        <Facebook className="w-4 h-4" strokeWidth={1.25} />
      </a>
    )}
  </>
);

const PublicLayout = ({ children }: { children: ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const favorites = useFavorites();

  return (
    <FavoritesContext.Provider value={favorites}>
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label={`${SITE.name} home`}>
            <Logo className="h-12 lg:h-14 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {navLinks.map(l => (
              <NavLink
                key={l.label}
                to={l.to}
                end
                className={({ isActive }) =>
                  `hover:text-foreground transition-colors ${isActive && !l.to.includes('#') ? 'text-foreground' : ''}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccountButton className="hidden sm:block" />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button className="md:hidden inline-flex items-center justify-center w-9 h-9 border border-border/60" aria-label="Open menu">
                  <Menu className="w-4 h-4" strokeWidth={1.25} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="font-heading font-light text-2xl text-left">{SITE.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col">
                  {navLinks.map(l => (
                    <Link
                      key={l.label}
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      className="py-3 border-b border-border/60 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  ))}
                  <div className="mt-6" onClick={() => setMenuOpen(false)}>
                    <AccountButton />
                  </div>
                  <a href={SITE.phoneHref} className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 text-primary/80" strokeWidth={1.25} /> {SITE.phoneDisplay}
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16">{children}</main>

      <footer className="border-t border-border/60 mt-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <Logo className="h-10 w-auto" />
            <p className="text-sm text-muted-foreground max-w-sm font-light leading-relaxed">
              A boutique studio for bridal glam, signature hair, and skin rituals — crafted with care in every detail.
            </p>
            <div className="flex items-center gap-4">
              <SocialLinks />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-5 font-medium">Explore</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-light">
              {navLinks.map(l => (
                <li key={l.label}>
                  <Link to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-5 font-medium">Visit</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-light">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-primary/80 mt-0.5 shrink-0" strokeWidth={1.25} />
                <span>{SITE.city}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-primary/80 shrink-0" strokeWidth={1.25} />
                <a href={SITE.phoneHref} className="hover:text-foreground transition-colors">{SITE.phoneDisplay}</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-primary/80 shrink-0" strokeWidth={1.25} />
                <a href={`mailto:${SITE.email}`} className="hover:text-foreground transition-colors break-all">{SITE.email}</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-primary/80 shrink-0" strokeWidth={1.25} />
                <span>{SITE.hours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/60">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <p>© {new Date().getFullYear()} {SITE.name}</p>
            <Link to="/auth" className="hover:text-primary transition-colors">Staff &amp; client sign in</Link>
          </div>
        </div>
      </footer>
    </div>
    </FavoritesContext.Provider>
  );
};

export default PublicLayout;
