import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Phone, Menu, ArrowRight, X } from 'lucide-react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/packages', label: 'Packages' },
  { to: '/mehndi', label: 'Mehndi' },
  { to: '/#about', label: 'About', hash: true },
  { to: '/#contact', label: 'Contact', hash: true },
];

const PHONE_DISPLAY = '+92 300 1234567';
const PHONE_HREF = 'tel:+923001234567';

const SiteNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50">
      {/* dark glass strip like travellinks */}
      <div className="backdrop-blur-xl bg-[#0d0710]/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo with pink glow */}
          <Link to="/" className="relative flex items-center gap-2.5 group">
            <span
              className="absolute -inset-3 rounded-full opacity-70 blur-2xl -z-10 transition-opacity group-hover:opacity-100"
              style={{ background: 'radial-gradient(closest-side, hsl(328 85% 55% / 0.55), transparent)' }}
            />
            <Logo className="h-11 w-auto drop-shadow-[0_0_18px_hsl(328_85%_55%/0.55)]" />
          </Link>

          {/* Right cluster: phone pill + CTA pill + menu */}
          <div className="flex items-center gap-3">
            {/* Phone pill */}
            <a
              href={PHONE_HREF}
              className="hidden sm:inline-flex items-center gap-3 h-12 pl-1.5 pr-5 rounded-full bg-white/[0.04] border border-white/15 text-white/90 hover:text-white hover:border-primary/50 transition-colors"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Phone className="w-4 h-4 text-primary-foreground" />
              </span>
              <span className="text-sm font-semibold tracking-tight">{PHONE_DISPLAY}</span>
            </a>

            {/* Primary CTA pill (gradient) */}
            <a href="/#book" className="inline-flex">
              <Button
                className="h-12 px-6 rounded-full font-semibold text-sm shadow-[0_18px_40px_-18px_hsl(328_85%_55%/0.9)] border-0 text-primary-foreground hover:opacity-95"
                style={{ background: 'var(--gradient-primary)' }}
              >
                Book Now <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </a>

            {/* Menu drawer trigger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.04] border border-white/15 text-white hover:border-primary/50 hover:bg-primary/10 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 border-l border-white/10 bg-[#0d0710] text-white [&>button]:hidden"
              >
                <div className="flex items-center justify-between px-6 h-20 border-b border-white/10">
                  <Logo className="h-10 w-auto drop-shadow-[0_0_16px_hsl(328_85%_55%/0.55)]" />
                  <button
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/15 hover:border-primary/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-10 flex flex-col gap-1">
                  {links.map(l => {
                    const cls =
                      'group flex items-center justify-between py-4 border-b border-white/10 font-display text-2xl font-semibold tracking-tight text-white/85 hover:text-white transition-colors';
                    const inner = (
                      <>
                        <span>{l.label}</span>
                        <ArrowRight className="w-5 h-5 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </>
                    );
                    return l.hash ? (
                      <a key={l.to} href={l.to} className={cls} onClick={() => setOpen(false)}>
                        {inner}
                      </a>
                    ) : (
                      <NavLink key={l.to} to={l.to} className={cls} onClick={() => setOpen(false)}>
                        {inner}
                      </NavLink>
                    );
                  })}
                </div>

                <div className="px-6 pb-10 space-y-3">
                  <a
                    href={PHONE_HREF}
                    className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-white/[0.04] border border-white/15 hover:border-primary/50 transition-colors"
                  >
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--gradient-primary)' }}
                    >
                      <Phone className="w-4 h-4 text-primary-foreground" />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/60">Call us</p>
                      <p className="text-sm font-semibold">{PHONE_DISPLAY}</p>
                    </div>
                  </a>
                  <Link to="/admin" onClick={() => setOpen(false)} className="block">
                    <Button variant="outline" className="w-full rounded-full h-12 border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white">
                      Admin Panel
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
