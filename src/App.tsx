import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SalonProvider } from "@/context/SalonContext";
import Landing from "./pages/Landing";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SalonProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/bookings" element={<BookingsPage />} />
            <Route path="/admin/services" element={<ServicesPage />} />
            <Route path="/admin/deals" element={<DealsPage />} />
            <Route path="/admin/staff" element={<StaffPage />} />
            <Route path="/admin/customers" element={<CustomersPage />} />
            <Route path="/admin/invoices" element={<InvoicesPage />} />
            <Route path="/admin/requests" element={<RequestsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SalonProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
