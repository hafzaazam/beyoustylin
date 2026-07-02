import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  Staff, Customer, Service, Deal, Chair, Booking, Invoice,
  BookingStatus, EntityStatus, InvoiceItem, AppointmentRequest, AppointmentRequestStatus,
} from '@/types/salon';
import { buildInvoicePdf } from '@/lib/invoicePdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const now = () => new Date().toISOString();

// ------ Row mappers (snake_case DB ↔ camelCase app) ------
const mapStaff = (r: any): Staff => ({ id: r.id, name: r.name, role: r.role, phone: r.phone ?? '', status: r.status, createdAt: r.created_at });
const mapCustomer = (r: any): Customer => ({ id: r.id, name: r.name, phone: r.phone, email: r.email ?? undefined, address: r.address ?? undefined, status: r.status, createdAt: r.created_at });
const mapService = (r: any): Service => ({ id: r.id, name: r.name, category: r.category, price: Number(r.price), duration: r.duration, status: r.status });
const mapDeal = (r: any): Deal => ({ id: r.id, name: r.name, serviceIds: r.service_ids || [], discountedPrice: Number(r.discounted_price), totalDuration: r.total_duration, status: r.status });
const mapChair = (r: any): Chair => ({ id: r.id, name: r.name, status: r.status });
const mapBooking = (r: any): Booking => ({
  id: r.id, customerId: r.customer_id, staffId: r.staff_id, chairId: r.chair_id,
  serviceIds: r.service_ids || [], dealId: r.deal_id ?? undefined,
  startTime: r.start_time, endTime: r.end_time,
  totalPrice: Number(r.total_price), totalDuration: r.total_duration,
  status: r.status, createdAt: r.created_at,
});
const mapInvoice = (r: any): Invoice => ({
  id: r.id, invoiceNumber: r.invoice_number, bookingId: r.booking_id,
  customerId: r.customer_id, staffId: r.staff_id,
  items: r.items || [], totalAmount: Number(r.total_amount),
  createdAt: r.created_at, status: r.status,
  pdfDataUrl: r.pdf_data_url ?? undefined,
  pdfGeneratedAt: r.pdf_generated_at ?? undefined,
});
const mapRequest = (r: any): AppointmentRequest => ({
  id: r.id, type: r.type, name: r.name, phone: r.phone, email: r.email ?? undefined,
  serviceId: r.service_id ?? undefined, dealId: r.deal_id ?? undefined,
  preferredDate: r.preferred_date ?? undefined, preferredTime: r.preferred_time ?? undefined,
  eventDate: r.event_date ?? undefined, budget: r.budget ?? undefined,
  notes: r.notes ?? undefined, status: r.status, createdAt: r.created_at,
});

interface SalonContextType {
  staff: Staff[]; customers: Customer[]; services: Service[]; deals: Deal[];
  chairs: Chair[]; bookings: Booking[]; invoices: Invoice[]; appointmentRequests: AppointmentRequest[];
  loading: boolean;

  addStaff: (s: Omit<Staff, 'id' | 'createdAt'>) => Promise<void>;
  updateStaff: (id: string, s: Partial<Staff>) => Promise<void>;
  toggleStaffStatus: (id: string) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;

  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  toggleCustomerStatus: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addService: (s: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, s: Partial<Service>) => Promise<void>;
  toggleServiceStatus: (id: string) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  addDeal: (d: Omit<Deal, 'id' | 'totalDuration'>) => Promise<void>;
  updateDeal: (id: string, d: Partial<Deal>) => Promise<void>;
  toggleDealStatus: (id: string) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;

  addChair: (c: Omit<Chair, 'id'>) => Promise<void>;
  updateChair: (id: string, c: Partial<Chair>) => Promise<void>;
  deleteChair: (id: string) => Promise<void>;

  addBooking: (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration'>) => Promise<Booking | string>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  checkOverlap: (staffId: string, chairId: string, startTime: string, duration: number, excludeId?: string) => boolean;

  createWalkIn: (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration' | 'status'>) => Promise<Booking | string>;

  addAppointmentRequest: (r: Omit<AppointmentRequest, 'id' | 'createdAt' | 'status'>) => Promise<AppointmentRequest | null>;
  updateAppointmentRequestStatus: (id: string, status: AppointmentRequestStatus) => Promise<void>;
  deleteAppointmentRequest: (id: string) => Promise<void>;

  getStaffById: (id: string) => Staff | undefined;
  getCustomerById: (id: string) => Customer | undefined;
  getServiceById: (id: string) => Service | undefined;
  getDealById: (id: string) => Deal | undefined;
  getChairById: (id: string) => Chair | undefined;
  getInvoiceByBookingId: (bookingId: string) => Invoice | undefined;
}

const SalonContext = createContext<SalonContextType | null>(null);

export const useSalon = () => {
  const ctx = useContext(SalonContext);
  if (!ctx) throw new Error('useSalon must be used within SalonProvider');
  return ctx;
};

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const { isStaff, user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Public data: services + deals (visible signed out for landing/services/packages pages)
  const loadPublic = useCallback(async () => {
    const [svc, dl] = await Promise.all([
      supabase.from('services').select('*').order('category').order('name'),
      supabase.from('deals').select('*').order('name'),
    ]);
    setServices((svc.data || []).map(mapService));
    setDeals((dl.data || []).map(mapDeal));
  }, []);

  // Staff-only data
  const loadPrivate = useCallback(async () => {
    const [st, cu, ch, bk, inv, req] = await Promise.all([
      supabase.from('staff').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
      supabase.from('chairs').select('*').order('name'),
      supabase.from('bookings').select('*').order('start_time', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('appointment_requests').select('*').order('created_at', { ascending: false }),
    ]);
    setStaff((st.data || []).map(mapStaff));
    setCustomers((cu.data || []).map(mapCustomer));
    setChairs((ch.data || []).map(mapChair));
    setBookings((bk.data || []).map(mapBooking));
    setInvoices((inv.data || []).map(mapInvoice));
    setAppointmentRequests((req.data || []).map(mapRequest));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPublic();
      if (isStaff) await loadPrivate();
      setLoading(false);
    })();
  }, [isStaff, user?.id, loadPublic, loadPrivate]);

  // Helpers
  const getStaffById = useCallback((id: string) => staff.find(s => s.id === id), [staff]);
  const getCustomerById = useCallback((id: string) => customers.find(c => c.id === id), [customers]);
  const getServiceById = useCallback((id: string) => services.find(s => s.id === id), [services]);
  const getDealById = useCallback((id: string) => deals.find(d => d.id === id), [deals]);
  const getChairById = useCallback((id: string) => chairs.find(c => c.id === id), [chairs]);
  const getInvoiceByBookingId = useCallback((bid: string) => invoices.find(i => i.bookingId === bid), [invoices]);

  const toggle = (status: EntityStatus): EntityStatus => status === 'active' ? 'disabled' : 'active';

  // -------- Staff CRUD --------
  const addStaff = async (s: Omit<Staff, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('staff').insert({ name: s.name, role: s.role, phone: s.phone, status: s.status }).select().single();
    if (data) setStaff(p => [...p, mapStaff(data)]);
  };
  const updateStaff = async (id: string, s: Partial<Staff>) => {
    const patch: any = {};
    if (s.name !== undefined) patch.name = s.name;
    if (s.role !== undefined) patch.role = s.role;
    if (s.phone !== undefined) patch.phone = s.phone;
    if (s.status !== undefined) patch.status = s.status;
    const { data } = await supabase.from('staff').update(patch).eq('id', id).select().single();
    if (data) setStaff(p => p.map(x => x.id === id ? mapStaff(data) : x));
  };
  const toggleStaffStatus = async (id: string) => {
    const cur = staff.find(x => x.id === id); if (!cur) return;
    await updateStaff(id, { status: toggle(cur.status) });
  };
  const deleteStaff = async (id: string) => {
    await supabase.from('staff').delete().eq('id', id);
    setStaff(p => p.filter(x => x.id !== id));
  };

  // -------- Customer CRUD --------
  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('customers').insert({ name: c.name, phone: c.phone, email: c.email, address: c.address, status: c.status }).select().single();
    if (data) setCustomers(p => [...p, mapCustomer(data)]);
  };
  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    const patch: any = {};
    ['name', 'phone', 'email', 'address', 'status'].forEach(k => { if ((c as any)[k] !== undefined) patch[k] = (c as any)[k]; });
    const { data } = await supabase.from('customers').update(patch).eq('id', id).select().single();
    if (data) setCustomers(p => p.map(x => x.id === id ? mapCustomer(data) : x));
  };
  const toggleCustomerStatus = async (id: string) => {
    const cur = customers.find(x => x.id === id); if (!cur) return;
    await updateCustomer(id, { status: toggle(cur.status) });
  };
  const deleteCustomer = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    setCustomers(p => p.filter(x => x.id !== id));
  };

  // -------- Service CRUD --------
  const addService = async (s: Omit<Service, 'id'>) => {
    const { data } = await supabase.from('services').insert({ name: s.name, category: s.category, price: s.price, duration: s.duration, status: s.status }).select().single();
    if (data) setServices(p => [...p, mapService(data)]);
  };
  const updateService = async (id: string, s: Partial<Service>) => {
    const patch: any = {};
    ['name', 'category', 'price', 'duration', 'status'].forEach(k => { if ((s as any)[k] !== undefined) patch[k] = (s as any)[k]; });
    const { data } = await supabase.from('services').update(patch).eq('id', id).select().single();
    if (data) setServices(p => p.map(x => x.id === id ? mapService(data) : x));
  };
  const toggleServiceStatus = async (id: string) => {
    const cur = services.find(x => x.id === id); if (!cur) return;
    await updateService(id, { status: toggle(cur.status) });
  };
  const deleteService = async (id: string) => {
    await supabase.from('services').delete().eq('id', id);
    setServices(p => p.filter(x => x.id !== id));
  };

  // -------- Deals --------
  const calcDealDuration = (serviceIds: string[]) =>
    serviceIds.reduce((sum, sid) => sum + (services.find(s => s.id === sid)?.duration || 0), 0);

  const addDeal = async (d: Omit<Deal, 'id' | 'totalDuration'>) => {
    const total_duration = calcDealDuration(d.serviceIds);
    const { data } = await supabase.from('deals').insert({
      name: d.name, service_ids: d.serviceIds, discounted_price: d.discountedPrice, total_duration, status: d.status,
    }).select().single();
    if (data) setDeals(p => [...p, mapDeal(data)]);
  };
  const updateDeal = async (id: string, d: Partial<Deal>) => {
    const patch: any = {};
    if (d.name !== undefined) patch.name = d.name;
    if (d.discountedPrice !== undefined) patch.discounted_price = d.discountedPrice;
    if (d.status !== undefined) patch.status = d.status;
    if (d.serviceIds !== undefined) { patch.service_ids = d.serviceIds; patch.total_duration = calcDealDuration(d.serviceIds); }
    const { data } = await supabase.from('deals').update(patch).eq('id', id).select().single();
    if (data) setDeals(p => p.map(x => x.id === id ? mapDeal(data) : x));
  };
  const toggleDealStatus = async (id: string) => {
    const cur = deals.find(x => x.id === id); if (!cur) return;
    await updateDeal(id, { status: toggle(cur.status) });
  };
  const deleteDeal = async (id: string) => {
    await supabase.from('deals').delete().eq('id', id);
    setDeals(p => p.filter(x => x.id !== id));
  };

  // -------- Chairs --------
  const addChair = async (c: Omit<Chair, 'id'>) => {
    const { data } = await supabase.from('chairs').insert({ name: c.name, status: c.status }).select().single();
    if (data) setChairs(p => [...p, mapChair(data)]);
  };
  const updateChair = async (id: string, c: Partial<Chair>) => {
    const patch: any = {};
    if (c.name !== undefined) patch.name = c.name;
    if (c.status !== undefined) patch.status = c.status;
    const { data } = await supabase.from('chairs').update(patch).eq('id', id).select().single();
    if (data) setChairs(p => p.map(x => x.id === id ? mapChair(data) : x));
  };
  const deleteChair = async (id: string) => {
    await supabase.from('chairs').delete().eq('id', id);
    setChairs(p => p.filter(x => x.id !== id));
  };

  // -------- Overlap --------
  const checkOverlap = useCallback((staffId: string, chairId: string, startTime: string, duration: number, excludeId?: string) => {
    const newStart = new Date(startTime).getTime();
    const newEnd = newStart + duration * 60000;
    return bookings.some(b => {
      if (b.id === excludeId) return false;
      if (b.status === 'canceled' || b.status === 'completed') return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      const timeOverlaps = newStart < bEnd && newEnd > bStart;
      return timeOverlaps && (b.staffId === staffId || b.chairId === chairId);
    });
  }, [bookings]);

  // -------- Bookings + auto-invoice --------
  const addBooking = async (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration'>): Promise<Booking | string> => {
    let totalPrice = 0, totalDuration = 0;
    if (b.dealId) {
      const deal = deals.find(d => d.id === b.dealId);
      if (deal) { totalPrice = deal.discountedPrice; totalDuration = deal.totalDuration; }
    } else {
      b.serviceIds.forEach(sid => {
        const svc = services.find(s => s.id === sid);
        if (svc) { totalPrice += svc.price; totalDuration += svc.duration; }
      });
    }
    if (checkOverlap(b.staffId, b.chairId, b.startTime, totalDuration)) {
      return 'Booking conflicts with an existing booking (staff or chair overlap).';
    }
    const endTime = new Date(new Date(b.startTime).getTime() + totalDuration * 60000).toISOString();

    const { data, error } = await supabase.from('bookings').insert({
      customer_id: b.customerId, staff_id: b.staffId, chair_id: b.chairId,
      service_ids: b.serviceIds, deal_id: b.dealId ?? null,
      start_time: b.startTime, end_time: endTime,
      total_price: totalPrice, total_duration: totalDuration, status: b.status,
    }).select().single();
    if (error || !data) return error?.message || 'Failed to create booking';
    const booking = mapBooking(data);
    setBookings(p => [booking, ...p]);

    // Generate invoice
    const items: InvoiceItem[] = [];
    if (booking.dealId) {
      const deal = deals.find(d => d.id === booking.dealId);
      if (deal) items.push({ name: deal.name, price: deal.discountedPrice, type: 'deal' });
    } else {
      booking.serviceIds.forEach(sid => {
        const svc = services.find(s => s.id === sid);
        if (svc) items.push({ name: svc.name, price: svc.price, type: 'service' });
      });
    }
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { data: invData } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber, booking_id: booking.id,
      customer_id: booking.customerId, staff_id: booking.staffId,
      items: items as any, total_amount: booking.totalPrice, status: 'unpaid',
    }).select().single();
    if (invData) setInvoices(p => [mapInvoice(invData), ...p]);

    return booking;
  };

  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    const { data } = await supabase.from('bookings').update({ status }).eq('id', id).select().single();
    if (data) setBookings(p => p.map(b => b.id === id ? mapBooking(data) : b));

    if (status === 'confirmed') {
      const inv = invoices.find(i => i.bookingId === id);
      if (inv && !inv.pdfDataUrl) {
        const booking = bookings.find(b => b.id === id);
        const customer = customers.find(c => c.id === inv.customerId);
        const staffMember = staff.find(s => s.id === inv.staffId);
        try {
          const pdfDataUrl = buildInvoicePdf({ invoice: inv, booking, customer, staff: staffMember });
          const gen = now();
          const { data: updated } = await supabase.from('invoices').update({ pdf_data_url: pdfDataUrl, pdf_generated_at: gen }).eq('id', inv.id).select().single();
          if (updated) setInvoices(p => p.map(i => i.id === inv.id ? mapInvoice(updated) : i));
        } catch { /* noop */ }
      }
    }
  };

  const deleteBooking = async (id: string) => {
    await supabase.from('bookings').delete().eq('id', id);
    setBookings(p => p.filter(b => b.id !== id));
    setInvoices(p => p.filter(i => i.bookingId !== id));
  };

  const createWalkIn = async (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration' | 'status'>) => {
    return addBooking({ ...b, status: 'completed' });
  };

  // -------- Appointment Requests (public) --------
  const addAppointmentRequest = async (r: Omit<AppointmentRequest, 'id' | 'createdAt' | 'status'>) => {
    const { data, error } = await supabase.from('appointment_requests').insert({
      type: r.type, name: r.name, phone: r.phone, email: r.email ?? null,
      service_id: r.serviceId ?? null, deal_id: r.dealId ?? null,
      preferred_date: r.preferredDate ?? null, preferred_time: r.preferredTime ?? null,
      event_date: r.eventDate ?? null, budget: r.budget ?? null, notes: r.notes ?? null,
    }).select().single();
    if (error || !data) return null;
    const mapped = mapRequest(data);
    if (isStaff) setAppointmentRequests(p => [mapped, ...p]);
    return mapped;
  };
  const updateAppointmentRequestStatus = async (id: string, status: AppointmentRequestStatus) => {
    const { data } = await supabase.from('appointment_requests').update({ status }).eq('id', id).select().single();
    if (data) setAppointmentRequests(p => p.map(x => x.id === id ? mapRequest(data) : x));
  };
  const deleteAppointmentRequest = async (id: string) => {
    await supabase.from('appointment_requests').delete().eq('id', id);
    setAppointmentRequests(p => p.filter(x => x.id !== id));
  };

  return (
    <SalonContext.Provider value={{
      staff, customers, services, deals, chairs, bookings, invoices, appointmentRequests, loading,
      addStaff, updateStaff, toggleStaffStatus, deleteStaff,
      addCustomer, updateCustomer, toggleCustomerStatus, deleteCustomer,
      addService, updateService, toggleServiceStatus, deleteService,
      addDeal, updateDeal, toggleDealStatus, deleteDeal,
      addChair, updateChair, deleteChair,
      addBooking, updateBookingStatus, deleteBooking, checkOverlap,
      createWalkIn,
      addAppointmentRequest, updateAppointmentRequestStatus, deleteAppointmentRequest,
      getStaffById, getCustomerById, getServiceById, getDealById, getChairById, getInvoiceByBookingId,
    }}>
      {children}
    </SalonContext.Provider>
  );
};
