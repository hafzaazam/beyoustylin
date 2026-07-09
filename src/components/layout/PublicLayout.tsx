import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, MapPin, Phone, Mail } from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { ReactNode } from 'react';

const navLinks = [
  { to: '/services', label: 'Services' },
  { to: '/packages', label: 'Packages' },
  { to: '/mehndi', label: 'Mehndi' },
  { to: '/services', label: 'Book' },
  { to: '/#about', label: 'About' },
  { to: '/#contact', label: 'Contact' },
];

const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-12 lg:h-14 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {navLinks.map(l =>
              l.to.startsWith('/#') ? (
                <a key={l.to} href={l.to} className="hover:text-foreground transition-colors">{l.label}</a>
              ) : (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `hover:text-foreground transition-colors ${isActive ? 'text-foreground' : ''}`
                  }
                >
                  {l.label}
                </NavLink>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/admin">
              <Button size="sm" variant="outline" className="rounded-none text-[10px] uppercase tracking-[0.2em]">Admin</Button>
            </Link>
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
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-4 h-4" strokeWidth={1.25} />
              </a>
              <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-4 h-4" strokeWidth={1.25} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-5 font-medium">Explore</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-light">
              {navLinks.map(l => (
                <li key={l.to}>
                  {l.to.startsWith('/#') ? (
                    <a href={l.to} className="hover:text-foreground transition-colors">{l.label}</a>
                  ) : (
                    <Link to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-5 font-medium">Visit</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-light">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-primary/80 mt-0.5 shrink-0" strokeWidth={1.25} />
                <span>Lahore, Pakistan</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-primary/80 shrink-0" strokeWidth={1.25} />
                <a href="tel:+920000000000" className="hover:text-foreground transition-colors">+92 000 000 0000</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-primary/80 shrink-0" strokeWidth={1.25} />
                <a href="mailto:hello@beyoustylin.com" className="hover:text-foreground transition-colors">hello@beyoustylin.com</a>
              </li>
              <li className="text-[10px] uppercase tracking-widest text-muted-foreground pt-2">Tue – Sun · 11–9</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/60">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <p>© {new Date().getFullYear()} BeYou Stylin</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
