import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Instagram, Facebook, Sparkles, MapPin, Phone, Mail, Clock,
  ArrowRight, Heart, Crown, Flower2,
} from 'lucide-react';
import Logo from '@/components/Logo';
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
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-10 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
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
          <Link to="/admin">
            <Button size="sm" variant="outline">Admin Panel</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 pt-16">{children}</main>

      <footer className="relative mt-24 overflow-hidden border-t border-primary/15 bg-gradient-to-b from-background via-secondary/30 to-background">
        {/* ambient glow accents */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        {/* CTA band */}
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-14">
          <div
            className="relative overflow-hidden rounded-3xl px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6 ring-1 ring-primary/20 shadow-[0_20px_60px_-20px_hsl(328_85%_55%/0.35)]"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary-foreground/20 blur-3xl" />
            <div className="relative flex items-center gap-4 text-primary-foreground">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/30 items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-primary-foreground/85">Ready to glow</p>
                <h3 className="font-heading text-xl md:text-2xl font-semibold tracking-tight">
                  Book your BeYou Stylin moment today
                </h3>
              </div>
            </div>
            <Link to="/services" className="relative">
              <Button size="lg" variant="secondary" className="rounded-full font-semibold shadow-lg hover:shadow-xl">
                Book Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Main grid */}
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-14 pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <Logo className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A boutique studio for bridal glam, signature hair, and skin rituals — crafted with care in every detail.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[
                { icon: Instagram, href: '#', label: 'Instagram' },
                { icon: Facebook, href: '#', label: 'Facebook' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary hover:text-primary-foreground hover:-translate-y-0.5 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Flower2 className="w-4 h-4 text-primary" /> Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {navLinks.map(l => (
                <li key={l.to}>
                  {l.to.startsWith('/#') ? (
                    <a href={l.to} className="hover:text-primary transition-colors inline-flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.to} className="hover:text-primary transition-colors inline-flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Signature */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" /> Signature
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/packages" className="hover:text-primary transition-colors">Bridal Barat Packages</Link></li>
              <li><Link to="/services" className="hover:text-primary transition-colors">Signature Makeup</Link></li>
              <li><Link to="/services" className="hover:text-primary transition-colors">Hair Treatments</Link></li>
              <li><Link to="/services" className="hover:text-primary transition-colors">Mehndi & Nails</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" /> Visit us
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>BeYou Stylin Studio, Lahore, Pakistan</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href="tel:+920000000000" className="hover:text-primary transition-colors">+92 000 000 0000</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href="mailto:hello@beyoustylin.com" className="hover:text-primary transition-colors">hello@beyoustylin.com</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Tue – Sun · 11:00 AM – 9:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative border-t border-primary/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              © {new Date().getFullYear()} <span className="font-semibold text-foreground">BeYou Stylin</span>. Crafted with
              <Heart className="w-3.5 h-3.5 text-primary fill-primary" /> in Lahore.
            </p>
            <div className="flex items-center gap-5">
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
