import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Gem, CalendarHeart, MailOpen, ReceiptText, Flower2, UserRound,
  Menu, X, LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

const navItems = [
  { path: '/account', label: 'Overview', icon: Gem },
  { path: '/account/appointments', label: 'Appointments', icon: CalendarHeart },
  { path: '/account/requests', label: 'Requests', icon: MailOpen },
  { path: '/account/invoices', label: 'Invoices', icon: ReceiptText },
  { path: '/account/favorites', label: 'Favorites', icon: Flower2 },
  { path: '/account/profile', label: 'Profile', icon: UserRound },
];

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const CustomerLayout = ({ children, title, subtitle }: Props) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  usePageTitle(title);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initial = (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border/60 transform transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:self-start flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-6 border-b border-border/60">
          <Link to="/" className="flex items-center gap-3 flex-1 min-w-0">
            <Logo className="h-10 w-auto" />
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground truncate">BeYou Stylin</h1>
              <p className="text-xs text-muted-foreground">My account</p>
            </div>
          </Link>
          <button className="lg:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto space-y-1" aria-label="My account">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 px-4 min-h-11 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/#book"
            onClick={() => setOpen(false)}
            className="md:hidden mt-4 flex items-center justify-center min-h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Book an appointment
          </Link>
        </nav>

        <div className="p-4 border-t border-border/60 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Member</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 min-h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 px-4 lg:px-10 py-4 lg:py-5 flex items-center gap-4 border-b border-border/60 bg-background/90 backdrop-blur">
          <button
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border hover:border-primary/40 transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">
              {subtitle || 'My account'}
            </p>
            <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-foreground tracking-tight leading-tight truncate">
              {title}
            </h2>
          </div>
          <ThemeToggle />
          <Link
            to="/#book"
            className="hidden md:inline-flex items-center gap-2 min-h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Book an appointment
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-10 animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default CustomerLayout;
