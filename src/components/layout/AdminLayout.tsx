import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Scissors, Gift, Users, UserCircle,
  FileText, Menu, X, ChevronRight, Inbox, LogOut
} from 'lucide-react';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import brandLogo from '@/assets/logo.png';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/requests', label: 'Requests', icon: Inbox },
  { path: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { path: '/admin/services', label: 'Services', icon: Scissors },
  { path: '/admin/deals', label: 'Deals', icon: Gift },
  { path: '/admin/staff', label: 'Staff', icon: Users },
  { path: '/admin/customers', label: 'Customers', icon: UserCircle },
  { path: '/admin/invoices', label: 'Invoices', icon: FileText },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { appointmentRequests } = useSalon();
  const { user, roles, signOut } = useAuth();
  const pendingRequests = appointmentRequests.filter(r => r.status === 'pending').length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 text-sidebar-foreground transform transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:self-start flex flex-col overflow-hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        {/* Ambient pink glow accents */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-sidebar-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative flex items-center gap-3 px-6 py-6 border-b border-sidebar-border/60">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/95 ring-2 ring-sidebar-primary/40 shadow-[0_8px_24px_-8px_hsl(328_85%_55%/0.6)] overflow-hidden">
            <img src={brandLogo} alt="BeYou Stylin" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-tight text-sidebar-primary-foreground">BeYou Stylin</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-primary/80 font-semibold">Admin Suite</p>
          </div>
          <button className="ml-auto lg:hidden text-sidebar-foreground hover:text-sidebar-primary transition-colors" onClick={() => setSidebarOpen(false)}>
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
                onClick={() => setSidebarOpen(false)}
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
                {item.path === '/admin/requests' && pendingRequests > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${active ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground ring-sidebar-primary-foreground/30' : 'bg-primary text-primary-foreground ring-primary/40 shadow-[0_0_10px_hsl(328_85%_55%/0.5)]'}`}>
                    {pendingRequests}
                  </span>
                )}
                {active && <ChevronRight className="w-3.5 h-3.5 text-sidebar-primary-foreground/90" />}
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-auto p-3 border-t border-sidebar-border/60">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-sidebar-accent/40 ring-1 ring-sidebar-primary/10 backdrop-blur-sm">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground ring-2 ring-sidebar-primary/30"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {(user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-primary/80 uppercase tracking-wider font-semibold">{roles[0] || 'staff'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/20 hover:text-destructive-foreground transition-all group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 relative overflow-hidden px-4 lg:px-8 py-4 flex items-center gap-4 border-b border-primary/10 bg-gradient-to-r from-background/85 via-secondary/40 to-background/85 backdrop-blur-xl shadow-[0_1px_0_hsl(0_0%_100%/0.6)_inset,0_10px_30px_-20px_hsl(328_85%_55%/0.35)]">
          {/* Top hairline gradient */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          {/* Soft pink glow */}
          <span className="pointer-events-none absolute -top-16 left-1/4 h-32 w-64 rounded-full bg-primary/20 blur-3xl" />

          <button
            className="relative lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="relative flex-1 min-w-0 pl-4">
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1.5 rounded-full shadow-[0_0_12px_hsl(328_85%_55%/0.6)]"
              style={{ background: 'var(--gradient-primary)' }}
            />
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-bold bg-clip-text text-transparent leading-none mb-1.5"
              style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
              BeYou Stylin
            </p>
            <h2 className="font-heading text-xl lg:text-2xl font-semibold text-foreground tracking-tight leading-tight truncate">
              {title}
            </h2>
          </div>

          {/* Decorative right-side chip */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/70 border border-primary/15 backdrop-blur-sm shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(152_45%_40%/0.8)]" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Live</span>
          </div>
        </header>


        <main className="flex-1 p-4 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
