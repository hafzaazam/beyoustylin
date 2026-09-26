import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SalonProvider } from '@/context/SalonContext';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute, { CustomerRoute, ManagerRoute } from '@/components/ProtectedRoute';
import Landing from './pages/Landing';

// Everything except the landing page is split into its own chunk so first-time
// visitors don't download the admin panel, PDF library and charts.
const ServicesPublic = lazy(() => import('./pages/ServicesPublic'));
const PackagesPublic = lazy(() => import('./pages/PackagesPublic'));
const MehndiPublic = lazy(() => import('./pages/MehndiPublic'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const DealsPage = lazy(() => import('./pages/DealsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ChairsPage = lazy(() => import('./pages/ChairsPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));

const AccountDashboard = lazy(() => import('./pages/account/AccountDashboard'));
const AccountAppointments = lazy(() => import('./pages/account/AccountAppointments'));
const AccountRequests = lazy(() => import('./pages/account/AccountRequests'));
const AccountInvoices = lazy(() => import('./pages/account/AccountInvoices'));
const AccountFavorites = lazy(() => import('./pages/account/AccountFavorites'));
const AccountProfile = lazy(() => import('./pages/account/AccountProfile'));

const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen grid place-items-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" />
  </div>
);

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors closeButton />
      <BrowserRouter>
        <AuthProvider>
          <SalonProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/services" element={<ServicesPublic />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/packages" element={<PackagesPublic />} />
                <Route path="/mehndi" element={<MehndiPublic />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/admin" element={<Protected><Dashboard /></Protected>} />
                <Route path="/admin/schedule" element={<Protected><SchedulePage /></Protected>} />
                <Route path="/admin/bookings" element={<Protected><BookingsPage /></Protected>} />
                <Route path="/admin/services" element={<Protected><ServicesPage /></Protected>} />
                <Route path="/admin/deals" element={<Protected><DealsPage /></Protected>} />
                <Route path="/admin/staff" element={<Protected><StaffPage /></Protected>} />
                <Route path="/admin/chairs" element={<Protected><ChairsPage /></Protected>} />
                <Route path="/admin/customers" element={<Protected><CustomersPage /></Protected>} />
                <Route path="/admin/invoices" element={<Protected><InvoicesPage /></Protected>} />
                <Route path="/admin/requests" element={<Protected><RequestsPage /></Protected>} />
                <Route path="/admin/team" element={<ManagerRoute><TeamPage /></ManagerRoute>} />

                <Route path="/account" element={<CustomerRoute><AccountDashboard /></CustomerRoute>} />
                <Route path="/account/appointments" element={<CustomerRoute><AccountAppointments /></CustomerRoute>} />
                <Route path="/account/requests" element={<CustomerRoute><AccountRequests /></CustomerRoute>} />
                <Route path="/account/invoices" element={<CustomerRoute><AccountInvoices /></CustomerRoute>} />
                <Route path="/account/favorites" element={<CustomerRoute><AccountFavorites /></CustomerRoute>} />
                <Route path="/account/profile" element={<CustomerRoute><AccountProfile /></CustomerRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </SalonProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
