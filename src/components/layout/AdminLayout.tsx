import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Scissors, Gift, Users, UserCircle,
  FileText, Menu, X, ChevronRight, Inbox, LogOut
} from 'lucide-react';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';

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
        className={`fixed inset-y-0 left-0 z-50 w-64 text-sidebar-foreground transform transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:self-start flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Scissors className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-tight text-sidebar-primary-foreground">BeYou Stylin</h1>
            <p className="text-[11px] uppercase tracking-widest text-sidebar-foreground/50">Admin</p>
          </div>
          <button className="ml-auto lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-sidebar-primary/15 text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-sidebar-primary" />
                )}
                <item.icon className={`w-4 h-4 ${active ? 'text-sidebar-primary' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {item.path === '/admin/requests' && pendingRequests > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {pendingRequests}
                  </span>
                )}
                {active && <ChevronRight className="w-3.5 h-3.5 text-sidebar-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-sidebar-accent/40">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground">
              {(user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-foreground/60 capitalize">{roles[0] || 'staff'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border/60 px-4 lg:px-8 py-4 flex items-center gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/80">BeYou Stylin</p>
            <h2 className="font-heading text-xl lg:text-2xl font-semibold text-foreground tracking-tight leading-tight truncate">{title}</h2>
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
