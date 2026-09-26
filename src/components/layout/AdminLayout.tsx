import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminShortcuts } from '@/hooks/useAdminShortcuts';
import ShortcutsDialog from '@/components/admin/ShortcutsDialog';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Gem, CalendarHeart, Scissors, Crown, Sparkles, HeartHandshake,
  ReceiptText, Menu, X, ChevronRight, MailOpen, LogOut, CalendarClock, Armchair, ShieldCheck, ExternalLink,
  ShoppingBag, Package, Ticket, BarChart3, History, Keyboard, WifiOff,
} from 'lucide-react';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';

interface NavItem { path: string; label: string; icon: typeof Gem; managersOnly?: boolean }

// Grouped so the sidebar reads as front desk → money → catalogue → setup.
const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { path: '/admin', label: 'Dashboard', icon: Gem },
      { path: '/admin/schedule', label: 'Schedule', icon: CalendarClock },
      { path: '/admin/requests', label: 'Requests', icon: MailOpen },
      { path: '/admin/bookings', label: 'Bookings', icon: CalendarHeart },
      { path: '/admin/pos', label: 'Point of sale', icon: ShoppingBag },
    ],
  },
  {
    label: 'Money',
    items: [
      { path: '/admin/invoices', label: 'Invoices', icon: ReceiptText },
      { path: '/admin/sales', label: 'Sales history', icon: History },
      { path: '/admin/vouchers', label: 'Vouchers & codes', icon: Ticket },
      { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { path: '/admin/customers', label: 'Customers', icon: HeartHandshake },
      { path: '/admin/services', label: 'Services', icon: Scissors },
      { path: '/admin/deals', label: 'Deals', icon: Crown },
      { path: '/admin/products', label: 'Products', icon: Package },
    ],
  },
  {
    label: 'Setup',
    items: [
      { path: '/admin/staff', label: 'Staff', icon: Sparkles },
      { path: '/admin/chairs', label: 'Chairs', icon: Armchair },
      { path: '/admin/team', label: 'Team & Access', icon: ShieldCheck, managersOnly: true },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  /** Buttons shown on the right of the page header. */
  actions?: React.ReactNode;
}

const AdminLayout = ({ children, title, actions }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { appointmentRequests, live, privateLoaded } = useSalon();
  const { user, roles, signOut, canManage } = useAuth();
  const pendingRequests = appointmentRequests.filter(r => r.status === 'pending').length;
  usePageTitle(title);
  const { helpOpen, setHelpOpen } = useAdminShortcuts();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-50 w-64 text-sidebar-foreground transform transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:self-start flex flex-col overflow-hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        <div className="relative flex items-center gap-3 px-5 py-4 border-b border-sidebar-border/60">
          <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white/95 ring-1 ring-sidebar-primary/40 overflow-hidden">
            <Logo className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-sidebar-accent-foreground">BeYou Stylin</h1>
            <p className="text-[11px] uppercase tracking-[0.16em] text-sidebar-primary font-semibold">Admin Suite</p>
          </div>
          <button className="ml-auto -mr-2 lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="relative p-3 flex-1 overflow-y-auto" aria-label="Admin">
          {navGroups.map((group, gi) => (
            <div key={group.label ?? gi} className={gi > 0 ? 'pt-3' : undefined}>
              {group.label && (
                <p className="px-4 pb-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-sidebar-foreground/60">{group.label}</p>
              )}
              <div className="space-y-1">
          {group.items.filter(item => !item.managersOnly || canManage).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                  active
                    ? 'text-sidebar-primary-foreground font-semibold'
                    : 'text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60'
                }`}
                style={active ? { background: 'var(--gradient-primary)' } : undefined}
              >
                <item.icon className={`w-4 h-4 shrink-0 transition-transform ${active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'}`} />
                <span className="flex-1">{item.label}</span>
                {item.path === '/admin/requests' && pendingRequests > 0 && (
                  <span
                    className={`min-w-[1.25rem] text-center text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground' : 'bg-sidebar-primary text-sidebar-primary-foreground'}`}
                    aria-label={`${pendingRequests} pending`}
                  >
                    {pendingRequests}
                  </span>
                )}
                {active && <ChevronRight className="w-3.5 h-3.5 text-sidebar-primary-foreground/90" />}
              </Link>
            );
          })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative mt-auto p-3 border-t border-sidebar-border/60">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2 mb-1 rounded-xl text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View public site
          </Link>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="hidden lg:flex w-full items-center gap-3 px-4 py-2 mb-1 rounded-xl text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" /> Keyboard shortcuts
            <kbd className="ml-auto rounded border border-sidebar-border px-1.5 text-[11px] font-sans text-sidebar-foreground/70">?</kbd>
          </button>
          <div className="flex items-center gap-3 pl-3 pr-1 py-1.5 rounded-xl bg-sidebar-accent/40 ring-1 ring-sidebar-primary/10">
            <div
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground ring-2 ring-sidebar-primary/30"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {(user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user?.email}</p>
              <p className="text-[11px] text-sidebar-primary capitalize font-semibold">{roles[0] || 'staff'}</p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-destructive/25 hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="print:hidden sticky top-0 z-30 px-4 lg:px-8 py-3 lg:py-4 flex items-center gap-3 lg:gap-4 border-b border-border bg-background/90 backdrop-blur-md">
          <button
            className="relative -ml-2 lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="relative flex-1 min-w-0">
            <h2 className="font-heading text-2xl lg:text-[1.75rem] font-semibold text-foreground tracking-tight leading-tight truncate">
              {title}
            </h2>
          </div>

          <div className="relative flex items-center gap-2">
            {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}
            {/* Only speak up when something is wrong: live updates are the normal state. */}
            {privateLoaded && !live && (
              <div
                role="status"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-warning/40 bg-warning/10 text-xs font-medium text-foreground"
              >
                <WifiOff className="w-3.5 h-3.5 text-warning" aria-hidden />
                Offline — refresh to see changes from other devices
              </div>
            )}
            <ThemeToggle className="max-lg:!w-11 max-lg:!h-11" />
          </div>
        </header>


        <main id="main" tabIndex={-1} className="flex-1 p-4 lg:p-8 animate-fade-in focus:outline-none">
          {actions && <div className="flex sm:hidden flex-wrap gap-2 mb-4">{actions}</div>}
          {privateLoaded ? children : (
            <div className="space-y-4" aria-busy="true" aria-label="Loading">
              <div className="h-10 w-64 rounded-lg bg-muted animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
              </div>
              <div className="h-72 rounded-2xl bg-muted animate-pulse" />
            </div>
          )}
        </main>
      </div>
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
};

export default AdminLayout;
