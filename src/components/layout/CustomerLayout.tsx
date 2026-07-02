import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Inbox, FileText, Heart, UserCircle,
  Menu, X, LogOut, Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/account', label: 'Overview', icon: LayoutDashboard },
  { path: '/account/appointments', label: 'Appointments', icon: CalendarCheck },
  { path: '/account/requests', label: 'My Requests', icon: Inbox },
  { path: '/account/invoices', label: 'Invoices', icon: FileText },
  { path: '/account/favorites', label: 'Favorites', icon: Heart },
  { path: '/account/profile', label: 'Profile', icon: UserCircle },
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initial = (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="flex min-h-screen">
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 text-sidebar-foreground transform transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:self-start flex flex-col overflow-hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-sidebar-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative flex items-center gap-3 px-6 py-6 border-b border-sidebar-border/60">
          <Link to="/" className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center ring-2 ring-sidebar-primary/40 shadow-[0_8px_24px_-8px_hsl(328_85%_55%/0.6)]"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <span className="font-heading text-lg font-bold text-sidebar-primary-foreground tracking-tight">BU</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-semibold tracking-tight text-sidebar-primary-foreground truncate">BeYou Stylin</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-primary/80 font-semibold">My Account</p>
            </div>
          </Link>
          <button className="lg:hidden text-sidebar-foreground hover:text-sidebar-primary transition-colors" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="relative p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'text-sidebar-primary-foreground shadow-[0_8px_24px_-10px_hsl(328_85%_55%/0.7)]'
                    : 'text-sidebar-foreground/75 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5'
                }`}
                style={active ? { background: 'var(--gradient-primary)' } : undefined}
              >
                {active && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-r-full bg-sidebar-primary shadow-[0_0_12px_hsl(335_92%_62%/0.9)]" />
                )}
                <item.icon className={`w-4 h-4 shrink-0 transition-transform ${active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-sidebar-primary group-hover:scale-110'}`} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-auto p-3 border-t border-sidebar-border/60">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-sidebar-accent/40 ring-1 ring-sidebar-primary/10">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground ring-2 ring-sidebar-primary/30"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-primary/80 uppercase tracking-wider font-semibold">Member</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/20 hover:text-destructive-foreground transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 relative overflow-hidden px-4 lg:px-8 py-4 flex items-center gap-4 border-b border-primary/10 bg-gradient-to-r from-background/85 via-secondary/40 to-background/85 backdrop-blur-xl">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <button
            className="relative lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => setOpen(true)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="relative flex-1 min-w-0 pl-4">
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1.5 rounded-full shadow-[0_0_12px_hsl(328_85%_55%/0.6)]"
              style={{ background: 'var(--gradient-primary)' }}
            />
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold bg-clip-text text-transparent leading-none mb-1.5" style={{ backgroundImage: 'var(--gradient-primary)' }}>
              {subtitle || 'My Account'}
            </p>
            <h2 className="font-heading text-xl lg:text-2xl font-semibold text-foreground tracking-tight leading-tight truncate">
              {title}
            </h2>
          </div>
          <Link
            to="/#book"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-10px_hsl(328_85%_55%/0.6)] hover:shadow-[0_12px_32px_-10px_hsl(328_85%_55%/0.75)] transition-shadow"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Sparkles className="w-4 h-4" /> Book new
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default CustomerLayout;
