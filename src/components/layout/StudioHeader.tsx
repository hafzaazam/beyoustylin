import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, Phone } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { SITE } from '@/config/site';

const links = [['/services', 'Services'], ['/packages', 'Bridal packages'], ['/mehndi', 'Mehndi'], ['/#about', 'Our studio'], ['/#contact', 'Contact']];
export default function StudioHeader() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  const { user, isStaff, rolesLoaded } = useAuth();
  const accountHref = !user ? '/auth' : isStaff ? '/admin' : '/account';
  const accountLabel = !user ? 'Sign in' : !rolesLoaded ? 'Account' : isStaff ? 'Dashboard' : 'My account';
  return (
    <header className="studio-header">
      <a href="#public-content" className="studio-skip">Skip to content</a>
      <div className="studio-header-inner">
        <Link to="/" aria-label={`${SITE.name} home`} className="studio-brand">
          <Logo className="h-14 w-14" />
          <span aria-hidden="true">BeYou <i>Stylin</i><small>Salon & bridal studio</small></span>
        </Link>
        <nav aria-label="Main navigation" className="studio-navigation">
          {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive && !to.includes('#') ? 'is-current' : ''}>{label}</NavLink>)}
        </nav>
        <div className="studio-header-actions">
          <ThemeToggle />
          <Link to={accountHref} className="studio-account">{accountLabel}</Link>
          <Link to="/#book" className="studio-book">Book a visit <ArrowUpRight size={16} /></Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><button className="studio-menu" aria-label="Open menu"><Menu size={21} strokeWidth={1.5} /></button></SheetTrigger>
            <SheetContent className="studio-mobile-menu">
              <SheetHeader><SheetTitle className="font-heading text-3xl text-left">BeYou Stylin</SheetTitle></SheetHeader>
              <nav aria-label="Mobile navigation" className="flex flex-col mt-8">
                {links.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="py-4 border-b border-border font-heading text-2xl">{label}</Link>)}
                <Link to={accountHref} onClick={() => setOpen(false)} className="py-5">{accountLabel}</Link>
                <Link to="/#book" onClick={() => setOpen(false)} className="studio-book justify-center">Book a visit <ArrowUpRight size={16} /></Link>
                <a href={SITE.phoneHref} className="mt-8 flex items-center gap-2 text-sm"><Phone size={16} />{SITE.phoneDisplay}</a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
