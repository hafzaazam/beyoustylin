import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Scissors, Instagram, Facebook } from 'lucide-react';
import brandLogo from '@/assets/logo.png';
import { ReactNode } from 'react';

const navLinks = [
  { to: '/services', label: 'Services' },
  { to: '/packages', label: 'Packages' },
  { to: '/#book', label: 'Book' },
  { to: '/#about', label: 'About' },
  { to: '/#contact', label: 'Contact' },
];

const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={brandLogo} alt="BeYou Stylin" className="h-10 w-auto object-contain" />
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

      <footer className="py-12 px-4 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold">BeYou Stylin</span>
            <span className="text-xs text-muted-foreground ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors"><Instagram className="w-4 h-4" /></a>
            <a href="#" className="hover:text-primary transition-colors"><Facebook className="w-4 h-4" /></a>
            <Link to="/admin" className="text-sm hover:text-primary transition-colors ml-2">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
