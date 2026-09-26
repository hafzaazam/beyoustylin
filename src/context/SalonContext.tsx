import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Staff, Customer, Service, Deal, Chair, Booking, Invoice, BookingInput,
  BookingStatus, EntityStatus, AppointmentRequest, AppointmentRequestStatus,
} from '@/types/salon';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { friendlyError } from '@/lib/errors';
import { Conflict, findConflict, normalizePhone } from '@/lib/booking';

// ------ Row mappers (snake_case DB ↔ camelCase app) ------
const mapStaff = (r: Tables<'staff'>): Staff => ({ id: r.id, name: r.name, role: r.role, phone: r.phone ?? '', status: r.status, createdAt: r.created_at });
const mapCustomer = (r: Tables<'customers'>): Customer => ({
  id: r.id, name: r.name, phone: r.phone, email: r.email ?? undefined, address: r.address ?? undefined,
  status: r.status, createdAt: r.created_at, userId: r.user_id ?? undefined,
});
const mapService = (r: Tables<'services'>): Service => ({
  id: r.id, name: r.name, category: r.category, description: r.description ?? undefined,
  price: Number(r.price), duration: r.duration, status: r.status,
});
const mapDeal = (r: Tables<'deals'>): Deal => ({ id: r.id, name: r.name, serviceIds: r.service_ids || [], discountedPrice: Number(r.discounted_price), totalDuration: r.total_duration, status: r.status });
const mapChair = (r: Tables<'chairs'>): Chair => ({ id: r.id, name: r.name, status: r.status });
const mapBooking = (r: Tables<'bookings'>): Booking => ({
  id: r.id, customerId: r.customer_id, staffId: r.staff_id, chairId: r.chair_id,
  serviceIds: r.service_ids || [], dealId: r.deal_id ?? undefined,
  startTime: r.start_time, endTime: r.end_time,
  totalPrice: Number(r.total_price), totalDuration: r.total_duration,
  customTotal: r.custom_total === null ? undefined : Number(r.custom_total),
  notes: r.notes ?? undefined,
  status: r.status, createdAt: r.created_at,
});
const mapInvoice = (r: Tables<'invoices'>): Invoice => ({
  id: r.id, invoiceNumber: r.invoice_number, bookingId: r.booking_id,
  customerId: r.customer_id, staffId: r.staff_id,
  items: (Array.isArray(r.items) ? r.items : []) as unknown as Invoice['items'],
  totalAmount: Number(r.total_amount),
  createdAt: r.created_at, status: r.status,
  paidAt: r.paid_at ?? undefined, paymentMethod: r.payment_method ?? undefined,
});
const mapRequest = (r: Tables<'appointment_requests'>): AppointmentRequest => ({
  id: r.id, type: r.type, name: r.name, phone: r.phone, email: r.email ?? undefined,
  serviceId: r.service_id ?? undefined, dealId: r.deal_id ?? undefined,
  preferredDate: r.preferred_date ?? undefined, preferredTime: r.preferred_time ?? undefined,
  eventDate: r.event_date ?? undefined, budget: r.budget ?? undefined,
  notes: r.notes ?? undefined, status: r.status, createdAt: r.created_at,
  bookingId: r.booking_id ?? undefined,
});

const bookingRow = (b: BookingInput) => ({
  customer_id: b.customerId,
  staff_id: b.staffId,
  chair_id: b.chairId,
  service_ids: b.dealId ? [] : b.serviceIds,
  deal_id: b.dealId ?? null,
  start_time: b.startTime,
  custom_total: b.customTotal ?? null,
  notes: b.notes?.trim() || null,
  status: b.status,
  // end_time / totals are computed by the bookings_compute_totals trigger;
  // start_time is sent as a placeholder end so the NOT NULL column is satisfied.
  end_time: b.startTime,
});

type LiveTable = 'bookings' | 'invoices' | 'appointment_requests';

interface SalonContextType {
  staff: Staff[]; customers: Customer[]; services: Service[]; deals: Deal[];
  chairs: Chair[]; bookings: Booking[]; invoices: Invoice[]; appointmentRequests: AppointmentRequest[];
  /** Public data (services, deals) loaded. */
  loading: boolean;
  /** Staff-only data loaded (false for customers and signed-out visitors). */
  privateLoaded: boolean;
  /** Realtime channel connected — other staff members' changes appear live. */
  live: boolean;
  refresh: () => Promise<void>;

  addStaff: (s: Omit<Staff, 'id' | 'createdAt'>) => Promise<boolean>;
  updateStaff: (id: string, s: Partial<Staff>) => Promise<boolean>;
  toggleStaffStatus: (id: string) => Promise<boolean>;
  deleteStaff: (id: string) => Promise<boolean>;

  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'userId'>) => Promise<Customer | null>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<boolean>;
  toggleCustomerStatus: (id: string) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  linkCustomerAccount: (id: string, email: string | null) => Promise<boolean>;
  findCustomerByPhone: (phone: string) => Customer | undefined;

  addService: (s: Omit<Service, 'id'>) => Promise<boolean>;
  updateService: (id: string, s: Partial<Service>) => Promise<boolean>;
  toggleServiceStatus: (id: string) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;

  addDeal: (d: Omit<Deal, 'id' | 'totalDuration'>) => Promise<boolean>;
  updateDeal: (id: string, d: Partial<Deal>) => Promise<boolean>;
  toggleDealStatus: (id: string) => Promise<boolean>;
  deleteDeal: (id: string) => Promise<boolean>;

  addChair: (c: Omit<Chair, 'id'>) => Promise<boolean>;
  updateChair: (id: string, c: Partial<Chair>) => Promise<boolean>;
  toggleChairStatus: (id: string) => Promise<boolean>;
  deleteChair: (id: string) => Promise<boolean>;

  /** Returns the saved booking, or an error message to show in the form. */
  addBooking: (b: BookingInput) => Promise<Booking | string>;
  updateBooking: (id: string, b: BookingInput) => Promise<Booking | string>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<boolean>;
  deleteBooking: (id: string) => Promise<boolean>;
  checkConflict: (c: { staffId: string; chairId: string; startTime: string; duration: number; excludeId?: string }) => Conflict | null;

  markInvoicePaid: (id: string, paymentMethod: string) => Promise<boolean>;
  markInvoiceUnpaid: (id: string) => Promise<boolean>;
  /** Marks the invoice of a booking paid (used by walk-ins). */
  payBooking: (bookingId: string, paymentMethod: string) => Promise<boolean>;

  addAppointmentRequest: (r: Omit<AppointmentRequest, 'id' | 'createdAt' | 'status' | 'bookingId'>) => Promise<{ error: string | null }>;
  updateAppointmentRequestStatus: (id: string, status: AppointmentRequestStatus) => Promise<boolean>;
  markRequestConverted: (id: string, bookingId: string) => Promise<boolean>;
  deleteAppointmentRequest: (id: string) => Promise<boolean>;

  getStaffById: (id: string) => Staff | undefined;
  getCustomerById: (id: string) => Customer | undefined;
  getServiceById: (id: string) => Service | undefined;
  getDealById: (id: string) => Deal | undefined;
  getChairById: (id: string) => Chair | undefined;
  getBookingById: (id: string) => Booking | undefined;
  getInvoiceByBookingId: (bookingId: string) => Invoice | undefined;
}

const SalonContext = createContext<SalonContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useSalon = () => {
  const ctx = useContext(SalonContext);
  if (!ctx) throw new Error('useSalon must be used within SalonProvider');
  return ctx;
};

const fail = (error: unknown) => {
  toast.error(friendlyError(error));
  return false as const;
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
  const [privateLoaded, setPrivateLoaded] = useState(false);
  const [live, setLive] = useState(false);

  // Public data: services + deals (visible signed out for landing/services/packages pages)
  const loadPublic = useCallback(async () => {
    const [svc, dl] = await Promise.all([
      supabase.from('services').select('*').order('category').order('name'),
      supabase.from('deals').select('*').order('name'),
    ]);
    if (svc.error || dl.error) console.error('Failed to load menu', svc.error ?? dl.error);
    setServices((svc.data || []).map(mapService));
    setDeals((dl.data || []).map(mapDeal));
  }, []);

  const loadTable = useCallback(async (table: LiveTable) => {
    if (table === 'bookings') {
      const { data, error } = await supabase.from('bookings').select('*').order('start_time', { ascending: false });
      if (!error) setBookings((data || []).map(mapBooking));
    } else if (table === 'invoices') {
      const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (!error) setInvoices((data || []).map(mapInvoice));
    } else {
      const { data, error } = await supabase.from('appointment_requests').select('*').order('created_at', { ascending: false });
      if (!error) setAppointmentRequests((data || []).map(mapRequest));
    }
  }, []);

  // Staff-only data
  const loadPrivate = useCallback(async () => {
    const [st, cu, ch] = await Promise.all([
      supabase.from('staff').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
      supabase.from('chairs').select('*').order('name'),
      loadTable('bookings'),
      loadTable('invoices'),
      loadTable('appointment_requests'),
    ]);
    const err = st.error ?? cu.error ?? ch.error;
    if (err) toast.error(`Could not load salon data: ${friendlyError(err)}`);
    setStaff((st.data || []).map(mapStaff));
    setCustomers((cu.data || []).map(mapCustomer));
    setChairs((ch.data || []).map(mapChair));
    setPrivateLoaded(true);
  }, [loadTable]);

  const clearPrivate = useCallback(() => {
    setStaff([]); setCustomers([]); setChairs([]); setBookings([]);
    setInvoices([]); setAppointmentRequests([]); setPrivateLoaded(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadPublic();
      if (cancelled) return;
      setLoading(false);
      // Never keep a previous staff session's data in memory after sign-out.
      if (isStaff) await loadPrivate();
      else clearPrivate();
    })();
    return () => { cancelled = true; };
  }, [isStaff, user?.id, loadPublic, loadPrivate, clearPrivate]);

  // Live updates from other devices (new online requests, bookings made at the front desk).
  const pending = useRef<Partial<Record<LiveTable, ReturnType<typeof setTimeout>>>>({});
  useEffect(() => {
    if (!isStaff) { setLive(false); return; }
    const schedule = (table: LiveTable) => {
      clearTimeout(pending.current[table]);
      pending.current[table] = setTimeout(() => loadTable(table), 300);
    };
    const channel = supabase
      .channel('salon-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => schedule('bookings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => schedule('invoices'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_requests' }, () => schedule('appointment_requests'))
      .subscribe(status => setLive(status === 'SUBSCRIBED'));
    const timers = pending.current;
    return () => {
      Object.values(timers).forEach(t => clearTimeout(t));
      supabase.removeChannel(channel);
      setLive(false);
    };
  }, [isStaff, loadTable]);

  const refresh = useCallback(async () => {
    await loadPublic();
    if (isStaff) await loadPrivate();
  }, [isStaff, loadPublic, loadPrivate]);

  // Helpers
  const getStaffById = useCallback((id: string) => staff.find(s => s.id === id), [staff]);
  const getCustomerById = useCallback((id: string) => customers.find(c => c.id === id), [customers]);
  const getServiceById = useCallback((id: string) => services.find(s => s.id === id), [services]);
  const getDealById = useCallback((id: string) => deals.find(d => d.id === id), [deals]);
  const getChairById = useCallback((id: string) => chairs.find(c => c.id === id), [chairs]);
  const getBookingById = useCallback((id: string) => bookings.find(b => b.id === id), [bookings]);
  const getInvoiceByBookingId = useCallback((bid: string) => invoices.find(i => i.bookingId === bid), [invoices]);
  const findCustomerByPhone = useCallback((phone: string) => {
    const key = normalizePhone(phone);
    return key.length >= 7 ? customers.find(c => normalizePhone(c.phone) === key) : undefined;
  }, [customers]);

  const toggle = (status: EntityStatus): EntityStatus => status === 'active' ? 'disabled' : 'active';

  /** Deletes a row and confirms it was actually removed (RLS silently deletes nothing). */
  const deleteRow = async (table: 'staff' | 'customers' | 'services' | 'deals' | 'chairs' | 'bookings' | 'appointment_requests', id: string) => {
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
    if (error) return fail(error);
    if (!data || data.length === 0) return fail("You don't have permission to delete this. Ask an owner or manager.");
    return true;
  };

  // -------- Staff --------
  const addStaff = async (s: Omit<Staff, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('staff').insert({ name: s.name, role: s.role, phone: s.phone, status: s.status }).select().single();
    if (error) return fail(error);
    setStaff(p => [...p, mapStaff(data)].sort((a, b) => a.name.localeCompare(b.name)));
    return true;
  };
  const updateStaff = async (id: string, s: Partial<Staff>) => {
    const { data, error } = await supabase.from('staff')
      .update({ name: s.name, role: s.role, phone: s.phone, status: s.status })
      .eq('id', id).select().single();
    if (error) return fail(error);
    setStaff(p => p.map(x => x.id === id ? mapStaff(data) : x));
    return true;
  };
  const toggleStaffStatus = async (id: string) => {
    const cur = staff.find(x => x.id === id); if (!cur) return false;
    return updateStaff(id, { status: toggle(cur.status) });
  };
  const deleteStaff = async (id: string) => {
    if (!(await deleteRow('staff', id))) return false;
    setStaff(p => p.filter(x => x.id !== id));
    return true;
  };

  // -------- Customers --------
  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt' | 'userId'>) => {
    const { data, error } = await supabase.from('customers')
      .insert({ name: c.name, phone: c.phone, email: c.email || null, address: c.address || null, status: c.status })
      .select().single();
    if (error) { fail(error); return null; }
    const created = mapCustomer(data);
    setCustomers(p => [...p, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  };
  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    const { data, error } = await supabase.from('customers')
      .update({
        name: c.name, phone: c.phone, status: c.status,
        email: c.email === undefined ? undefined : c.email || null,
        address: c.address === undefined ? undefined : c.address || null,
      })
      .eq('id', id).select().single();
    if (error) return fail(error);
    setCustomers(p => p.map(x => x.id === id ? mapCustomer(data) : x));
    return true;
  };
  const toggleCustomerStatus = async (id: string) => {
    const cur = customers.find(x => x.id === id); if (!cur) return false;
    return updateCustomer(id, { status: toggle(cur.status) });
  };
  const deleteCustomer = async (id: string) => {
    if (!(await deleteRow('customers', id))) return false;
    setCustomers(p => p.filter(x => x.id !== id));
    return true;
  };
  const linkCustomerAccount = async (id: string, email: string | null) => {
    const { data, error } = await supabase.rpc('link_customer_account', { _customer_id: id, _email: email });
    if (error) return fail(error);
    setCustomers(p => p.map(x => x.id === id ? { ...x, userId: data ?? undefined } : x));
    return true;
  };

  // -------- Services --------
  const addService = async (s: Omit<Service, 'id'>) => {
    const { data, error } = await supabase.from('services').insert({
      name: s.name, category: s.category, description: s.description || null,
      price: s.price, duration: s.duration, status: s.status,
    }).select().single();
    if (error) return fail(error);
    setServices(p => [...p, mapService(data)]);
    return true;
  };
  const updateService = async (id: string, s: Partial<Service>) => {
    const { data, error } = await supabase.from('services').update({
      name: s.name, category: s.category, price: s.price, duration: s.duration, status: s.status,
      description: s.description === undefined ? undefined : s.description || null,
    }).eq('id', id).select().single();
    if (error) return fail(error);
    setServices(p => p.map(x => x.id === id ? mapService(data) : x));
    // A duration change updates deal durations on the server.
    if (s.duration !== undefined) {
      const { data: dl } = await supabase.from('deals').select('*').order('name');
      if (dl) setDeals(dl.map(mapDeal));
    }
    return true;
  };
  const toggleServiceStatus = async (id: string) => {
    const cur = services.find(x => x.id === id); if (!cur) return false;
    return updateService(id, { status: toggle(cur.status) });
  };
  const deleteService = async (id: string) => {
    if (!(await deleteRow('services', id))) return false;
    setServices(p => p.filter(x => x.id !== id));
    return true;
  };

  // -------- Deals (total_duration is computed by the database) --------
  const addDeal = async (d: Omit<Deal, 'id' | 'totalDuration'>) => {
    const { data, error } = await supabase.from('deals').insert({
      name: d.name, service_ids: d.serviceIds, discounted_price: d.discountedPrice, status: d.status,
    }).select().single();
    if (error) return fail(error);
    setDeals(p => [...p, mapDeal(data)]);
    return true;
  };
  const updateDeal = async (id: string, d: Partial<Deal>) => {
    const { data, error } = await supabase.from('deals').update({
      name: d.name, discounted_price: d.discountedPrice, status: d.status, service_ids: d.serviceIds,
    }).eq('id', id).select().single();
    if (error) return fail(error);
    setDeals(p => p.map(x => x.id === id ? mapDeal(data) : x));
    return true;
  };
  const toggleDealStatus = async (id: string) => {
    const cur = deals.find(x => x.id === id); if (!cur) return false;
    return updateDeal(id, { status: toggle(cur.status) });
  };
  const deleteDeal = async (id: string) => {
    if (!(await deleteRow('deals', id))) return false;
    setDeals(p => p.filter(x => x.id !== id));
    return true;
  };

  // -------- Chairs --------
  const addChair = async (c: Omit<Chair, 'id'>) => {
    const { data, error } = await supabase.from('chairs').insert({ name: c.name, status: c.status }).select().single();
    if (error) return fail(error);
    setChairs(p => [...p, mapChair(data)].sort((a, b) => a.name.localeCompare(b.name)));
    return true;
  };
  const updateChair = async (id: string, c: Partial<Chair>) => {
    const { data, error } = await supabase.from('chairs').update({ name: c.name, status: c.status }).eq('id', id).select().single();
    if (error) return fail(error);
    setChairs(p => p.map(x => x.id === id ? mapChair(data) : x));
    return true;
  };
  const toggleChairStatus = async (id: string) => {
    const cur = chairs.find(x => x.id === id); if (!cur) return false;
    return updateChair(id, { status: toggle(cur.status) });
  };
  const deleteChair = async (id: string) => {
    if (!(await deleteRow('chairs', id))) return false;
    setChairs(p => p.filter(x => x.id !== id));
    return true;
  };

  // -------- Bookings (totals, overlap and invoices are enforced by the database) --------
  const checkConflict = useCallback(
    (c: { staffId: string; chairId: string; startTime: string; duration: number; excludeId?: string }) => findConflict(bookings, c),
    [bookings],
  );

  const refreshInvoiceFor = async (bookingId: string) => {
    const { data } = await supabase.from('invoices').select('*').eq('booking_id', bookingId).maybeSingle();
    if (!data) return;
    const inv = mapInvoice(data);
    setInvoices(p => p.some(i => i.id === inv.id) ? p.map(i => i.id === inv.id ? inv : i) : [inv, ...p]);
  };

  const addBooking = async (b: BookingInput): Promise<Booking | string> => {
    const { data, error } = await supabase.from('bookings').insert(bookingRow(b)).select().single();
    if (error) return friendlyError(error);
    const booking = mapBooking(data);
    setBookings(p => [booking, ...p]);
    await refreshInvoiceFor(booking.id);
    return booking;
  };

  const updateBooking = async (id: string, b: BookingInput): Promise<Booking | string> => {
    const { data, error } = await supabase.from('bookings').update(bookingRow(b)).eq('id', id).select().single();
    if (error) return friendlyError(error);
    const booking = mapBooking(data);
    setBookings(p => p.map(x => x.id === id ? booking : x));
    await refreshInvoiceFor(id);
    return booking;
  };

  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    const { data, error } = await supabase.from('bookings').update({ status }).eq('id', id).select().single();
    if (error) return fail(error);
    setBookings(p => p.map(b => b.id === id ? mapBooking(data) : b));
    await refreshInvoiceFor(id); // canceling voids the invoice, reopening restores it
    return true;
  };

  const deleteBooking = async (id: string) => {
    if (!(await deleteRow('bookings', id))) return false;
    setBookings(p => p.filter(b => b.id !== id));
    setInvoices(p => p.filter(i => i.bookingId !== id));
    return true;
  };

  // -------- Invoices --------
  const setInvoiceStatus = async (id: string, status: 'paid' | 'unpaid', paymentMethod: string | null) => {
    const { data, error } = await supabase.from('invoices')
      .update({ status, payment_method: paymentMethod })
      .eq('id', id).select().single();
    if (error) return fail(error);
    setInvoices(p => p.map(i => i.id === id ? mapInvoice(data) : i));
    return true;
  };
  const markInvoicePaid = (id: string, paymentMethod: string) => setInvoiceStatus(id, 'paid', paymentMethod);
  const markInvoiceUnpaid = (id: string) => setInvoiceStatus(id, 'unpaid', null);
  const payBooking = async (bookingId: string, paymentMethod: string) => {
    const { data, error } = await supabase.from('invoices')
      .update({ status: 'paid', payment_method: paymentMethod })
      .eq('booking_id', bookingId).select().single();
    if (error) return fail(error);
    const inv = mapInvoice(data);
    setInvoices(p => p.some(i => i.id === inv.id) ? p.map(i => i.id === inv.id ? inv : i) : [inv, ...p]);
    return true;
  };

  // -------- Appointment Requests --------
  const addAppointmentRequest = async (r: Omit<AppointmentRequest, 'id' | 'createdAt' | 'status' | 'bookingId'>) => {
    // Do not .select() the row back: anonymous visitors may insert but not read requests.
    const { error } = await supabase.from('appointment_requests').insert({
      type: r.type, name: r.name, phone: r.phone, email: r.email ?? null,
      service_id: r.serviceId ?? null, deal_id: r.dealId ?? null,
      preferred_date: r.preferredDate ?? null, preferred_time: r.preferredTime ?? null,
      event_date: r.eventDate ?? null, budget: r.budget ?? null, notes: r.notes ?? null,
      user_id: user?.id ?? null,
    });
    if (error) return { error: friendlyError(error) };
    if (isStaff) loadTable('appointment_requests');
    return { error: null };
  };
  const updateAppointmentRequestStatus = async (id: string, status: AppointmentRequestStatus) => {
    const { data, error } = await supabase.from('appointment_requests').update({ status }).eq('id', id).select().single();
    if (error) return fail(error);
    setAppointmentRequests(p => p.map(x => x.id === id ? mapRequest(data) : x));
    return true;
  };
  const markRequestConverted = async (id: string, bookingId: string) => {
    const { data, error } = await supabase.from('appointment_requests')
      .update({ status: 'approved', booking_id: bookingId }).eq('id', id).select().single();
    if (error) return fail(error);
    setAppointmentRequests(p => p.map(x => x.id === id ? mapRequest(data) : x));
    return true;
  };
  const deleteAppointmentRequest = async (id: string) => {
    if (!(await deleteRow('appointment_requests', id))) return false;
    setAppointmentRequests(p => p.filter(x => x.id !== id));
    return true;
  };

  return (
    <SalonContext.Provider value={{
      staff, customers, services, deals, chairs, bookings, invoices, appointmentRequests,
      loading, privateLoaded, live, refresh,
      addStaff, updateStaff, toggleStaffStatus, deleteStaff,
      addCustomer, updateCustomer, toggleCustomerStatus, deleteCustomer, linkCustomerAccount, findCustomerByPhone,
      addService, updateService, toggleServiceStatus, deleteService,
      addDeal, updateDeal, toggleDealStatus, deleteDeal,
      addChair, updateChair, toggleChairStatus, deleteChair,
      addBooking, updateBooking, updateBookingStatus, deleteBooking, checkConflict,
      markInvoicePaid, markInvoiceUnpaid, payBooking,
      addAppointmentRequest, updateAppointmentRequestStatus, markRequestConverted, deleteAppointmentRequest,
      getStaffById, getCustomerById, getServiceById, getDealById, getChairById, getBookingById, getInvoiceByBookingId,
    }}>
      {children}
    </SalonContext.Provider>
  );
};
