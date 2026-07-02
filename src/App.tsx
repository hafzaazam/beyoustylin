import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SalonProvider } from "@/context/SalonContext";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import ServicesPublic from "./pages/ServicesPublic";
import PackagesPublic from "./pages/PackagesPublic";
import ServiceDetail from "./pages/ServiceDetail";
import Auth from "./pages/Auth";

import Dashboard from "./pages/Dashboard";
import BookingsPage from "./pages/BookingsPage";
import ServicesPage from "./pages/ServicesPage";
import DealsPage from "./pages/DealsPage";
import StaffPage from "./pages/StaffPage";
import CustomersPage from "./pages/CustomersPage";
import InvoicesPage from "./pages/InvoicesPage";
import RequestsPage from "./pages/RequestsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SalonProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/services" element={<ServicesPublic />} />
              <Route path="/services/:id" element={<ServiceDetail />} />
              <Route path="/packages" element={<PackagesPublic />} />
              <Route path="/auth" element={<Auth />} />

              <Route path="/admin" element={<Protected><Dashboard /></Protected>} />
              <Route path="/admin/bookings" element={<Protected><BookingsPage /></Protected>} />
              <Route path="/admin/services" element={<Protected><ServicesPage /></Protected>} />
              <Route path="/admin/deals" element={<Protected><DealsPage /></Protected>} />
              <Route path="/admin/staff" element={<Protected><StaffPage /></Protected>} />
              <Route path="/admin/customers" element={<Protected><CustomersPage /></Protected>} />
              <Route path="/admin/invoices" element={<Protected><InvoicesPage /></Protected>} />
              <Route path="/admin/requests" element={<Protected><RequestsPage /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SalonProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
