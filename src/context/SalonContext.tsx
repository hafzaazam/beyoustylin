import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Staff, Customer, Service, Deal, Chair, Booking, Invoice,
  BookingStatus, EntityStatus, InvoiceItem
} from '@/types/salon';

// Helpers
const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// Sample data
const sampleChairs: Chair[] = [
  { id: genId(), name: 'Chair 1', status: 'active' },
  { id: genId(), name: 'Chair 2', status: 'active' },
  { id: genId(), name: 'Chair 3', status: 'active' },
  { id: genId(), name: 'Chair 4', status: 'active' },
];

const sampleStaff: Staff[] = [
  { id: genId(), name: 'Sarah Johnson', role: 'Hairdresser', phone: '555-0101', status: 'active', createdAt: now() },
  { id: genId(), name: 'Emily Chen', role: 'Makeup Artist', phone: '555-0102', status: 'active', createdAt: now() },
  { id: genId(), name: 'Maria Garcia', role: 'Nail Technician', phone: '555-0103', status: 'active', createdAt: now() },
];

const sampleServices: Service[] = [
  // Makeup
  { id: genId(), name: 'Additional Signature Makeup', category: 'Makeup', price: 20000, duration: 60, status: 'active' },
  { id: genId(), name: 'Barat Without Package', category: 'Makeup', price: 29000, duration: 120, status: 'active' },
  { id: genId(), name: 'Walima Makeup', category: 'Makeup', price: 29000, duration: 120, status: 'active' },
  { id: genId(), name: 'Nikah Makeup', category: 'Makeup', price: 29000, duration: 120, status: 'active' },
  { id: genId(), name: 'Engagement Makeup', category: 'Makeup', price: 26000, duration: 90, status: 'active' },
  { id: genId(), name: 'Model Makeup', category: 'Makeup', price: 25000, duration: 90, status: 'active' },
  { id: genId(), name: 'Only Hairstyle & Lashes', category: 'Makeup', price: 20000, duration: 60, status: 'active' },
  { id: genId(), name: 'Mehndi Makeup', category: 'Makeup', price: 20000, duration: 90, status: 'active' },
  { id: genId(), name: 'Party Makeup', category: 'Makeup', price: 7000, duration: 60, status: 'active' },
  // Hair Cutting
  { id: genId(), name: 'Additional Signature Haircut', category: 'Hair Cutting', price: 1000, duration: 30, status: 'active' },
  { id: genId(), name: 'Steps Cutting', category: 'Hair Cutting', price: 2000, duration: 40, status: 'active' },
  { id: genId(), name: 'Long Layer Cut', category: 'Hair Cutting', price: 2000, duration: 40, status: 'active' },
  { id: genId(), name: 'Feather Layer Cut', category: 'Hair Cutting', price: 1800, duration: 35, status: 'active' },
  { id: genId(), name: 'Butterfly Cut', category: 'Hair Cutting', price: 1900, duration: 35, status: 'active' },
  { id: genId(), name: 'Classic Bob Cut', category: 'Hair Cutting', price: 1800, duration: 30, status: 'active' },
  { id: genId(), name: 'Front Steps Front Bob Cut', category: 'Hair Cutting', price: 1800, duration: 30, status: 'active' },
  { id: genId(), name: 'Back Forward Cut', category: 'Hair Cutting', price: 800, duration: 20, status: 'active' },
  { id: genId(), name: 'Back Straight Cut', category: 'Hair Cutting', price: 700, duration: 20, status: 'active' },
  { id: genId(), name: 'Kids Back Steps Front Bob Cut', category: 'Hair Cutting', price: 800, duration: 20, status: 'active' },
  { id: genId(), name: 'Kids V Cut', category: 'Hair Cutting', price: 800, duration: 20, status: 'active' },
  { id: genId(), name: 'Kids Bob Cut', category: 'Hair Cutting', price: 800, duration: 20, status: 'active' },
  // Hair Treatment (custom price = 0)
  { id: genId(), name: 'Rebonding', category: 'Hair Treatment', price: 0, duration: 120, status: 'active' },
  { id: genId(), name: 'Hair Perming', category: 'Hair Treatment', price: 0, duration: 90, status: 'active' },
  { id: genId(), name: 'Hair Streaking', category: 'Hair Treatment', price: 0, duration: 90, status: 'active' },
  { id: genId(), name: 'Fashion Color Dye', category: 'Hair Treatment', price: 0, duration: 90, status: 'active' },
  { id: genId(), name: 'Extenso Treatment', category: 'Hair Treatment', price: 0, duration: 120, status: 'active' },
  { id: genId(), name: 'Hair Split Ends Treatment', category: 'Hair Treatment', price: 0, duration: 60, status: 'active' },
  { id: genId(), name: 'Keratin Treatment', category: 'Hair Treatment', price: 0, duration: 120, status: 'active' },
  // Mehndi
  { id: genId(), name: 'Bridal Sodani Mehndi', category: 'Mehndi', price: 7500, duration: 120, status: 'active' },
  { id: genId(), name: 'Bridal Simple Mehndi', category: 'Mehndi', price: 7000, duration: 90, status: 'active' },
  // Wax
  { id: genId(), name: 'Bridal Full Body Wax', category: 'Wax', price: 7000, duration: 90, status: 'active' },
  { id: genId(), name: 'Full Legs Wax', category: 'Wax', price: 2500, duration: 45, status: 'active' },
  { id: genId(), name: 'Half Legs Wax', category: 'Wax', price: 1200, duration: 25, status: 'active' },
  { id: genId(), name: 'Full Arms Wax', category: 'Wax', price: 1200, duration: 30, status: 'active' },
  { id: genId(), name: 'Half Arm Wax', category: 'Wax', price: 600, duration: 15, status: 'active' },
  // Threading
  { id: genId(), name: 'Eyebrows', category: 'Threading', price: 150, duration: 10, status: 'active' },
  { id: genId(), name: 'Upper Lips', category: 'Threading', price: 50, duration: 5, status: 'active' },
  { id: genId(), name: 'Forehead Threading', category: 'Threading', price: 100, duration: 10, status: 'active' },
  // Nails
  { id: genId(), name: 'Manicure', category: 'Nails', price: 1500, duration: 45, status: 'active' },
  { id: genId(), name: 'Pedicure', category: 'Nails', price: 700, duration: 30, status: 'active' },
  // Facial
  { id: genId(), name: 'Hydra Facial', category: 'Facial', price: 6500, duration: 60, status: 'active' },
  { id: genId(), name: 'Bridal Full Body Polish', category: 'Facial', price: 6500, duration: 90, status: 'active' },
  { id: genId(), name: '3D Facial', category: 'Facial', price: 4000, duration: 60, status: 'active' },
  { id: genId(), name: 'Bridal Gold Facial', category: 'Facial', price: 3000, duration: 60, status: 'active' },
  { id: genId(), name: 'Whitening Facial', category: 'Facial', price: 2100, duration: 45, status: 'active' },
  { id: genId(), name: 'Anti-Aging Facial', category: 'Facial', price: 2100, duration: 45, status: 'active' },
  { id: genId(), name: 'Herbal Polisher Facial', category: 'Facial', price: 2000, duration: 45, status: 'active' },
  { id: genId(), name: 'Herbal Simple Facial', category: 'Facial', price: 1900, duration: 40, status: 'active' },
  { id: genId(), name: 'Bleach + Massage + Mask', category: 'Facial', price: 1700, duration: 40, status: 'active' },
  // Add-ons
  { id: genId(), name: 'Artificial Lashes & Extensions', category: 'Add-on', price: 0, duration: 30, status: 'active' },
];

const svcId = (name: string) => sampleServices.find(s => s.name === name)?.id || '';
const svcDur = (names: string[]) => names.reduce((sum, n) => sum + (sampleServices.find(s => s.name === n)?.duration || 0), 0);

const baratSodaniNames = ['Herbal Simple Facial', 'Bleach + Massage + Mask', 'Eyebrows', 'Artificial Lashes & Extensions', 'Manicure', 'Full Arms Wax', 'Full Legs Wax', 'Bridal Sodani Mehndi'];
const baratSimpleNames = ['Herbal Simple Facial', 'Bleach + Massage + Mask', 'Eyebrows', 'Artificial Lashes & Extensions', 'Manicure', 'Full Arms Wax', 'Full Legs Wax', 'Bridal Simple Mehndi'];
const baratWithWaxNames = ['Herbal Simple Facial', 'Bleach + Massage + Mask', 'Eyebrows', 'Artificial Lashes & Extensions', 'Manicure', 'Full Arms Wax', 'Full Legs Wax'];
const baratWithoutWaxNames = ['Herbal Simple Facial', 'Bleach + Massage + Mask', 'Eyebrows', 'Artificial Lashes & Extensions', 'Manicure'];

const sampleDeals: Deal[] = [
  { id: genId(), name: 'Barat Package (Sodani Mehndi)', serviceIds: baratSodaniNames.map(svcId), discountedPrice: 39000, totalDuration: svcDur(baratSodaniNames), status: 'active' },
  { id: genId(), name: 'Barat Package (Simple Mehndi)', serviceIds: baratSimpleNames.map(svcId), discountedPrice: 38000, totalDuration: svcDur(baratSimpleNames), status: 'active' },
  { id: genId(), name: 'Barat Package (With Wax)', serviceIds: baratWithWaxNames.map(svcId), discountedPrice: 32000, totalDuration: svcDur(baratWithWaxNames), status: 'active' },
  { id: genId(), name: 'Barat Package (Without Wax)', serviceIds: baratWithoutWaxNames.map(svcId), discountedPrice: 31000, totalDuration: svcDur(baratWithoutWaxNames), status: 'active' },
];

const sampleCustomers: Customer[] = [
  { id: genId(), name: 'Alice Williams', phone: '555-1001', email: 'alice@email.com', status: 'active', createdAt: now() },
  { id: genId(), name: 'Jessica Brown', phone: '555-1002', status: 'active', createdAt: now() },
];

interface SalonContextType {
  // Data
  staff: Staff[];
  customers: Customer[];
  services: Service[];
  deals: Deal[];
  chairs: Chair[];
  bookings: Booking[];
  invoices: Invoice[];

  // Staff
  addStaff: (s: Omit<Staff, 'id' | 'createdAt'>) => void;
  updateStaff: (id: string, s: Partial<Staff>) => void;
  toggleStaffStatus: (id: string) => void;
  deleteStaff: (id: string) => void;

  // Customers
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  toggleCustomerStatus: (id: string) => void;
  deleteCustomer: (id: string) => void;

  // Services
  addService: (s: Omit<Service, 'id'>) => void;
  updateService: (id: string, s: Partial<Service>) => void;
  toggleServiceStatus: (id: string) => void;
  deleteService: (id: string) => void;

  // Deals
  addDeal: (d: Omit<Deal, 'id' | 'totalDuration'>) => void;
  updateDeal: (id: string, d: Partial<Deal>) => void;
  toggleDealStatus: (id: string) => void;
  deleteDeal: (id: string) => void;

  // Bookings
  addBooking: (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration'>) => Booking | string;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  deleteBooking: (id: string) => void;
  checkOverlap: (staffId: string, chairId: string, startTime: string, duration: number, excludeId?: string) => boolean;

  // Walk-in
  createWalkIn: (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration' | 'status'>) => Booking | string;

  // Helpers
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
  const [staff, setStaff] = useState<Staff[]>(sampleStaff);
  const [customers, setCustomers] = useState<Customer[]>(sampleCustomers);
  const [services, setServices] = useState<Service[]>(sampleServices);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [chairs] = useState<Chair[]>(sampleChairs);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Helpers
  const getStaffById = useCallback((id: string) => staff.find(s => s.id === id), [staff]);
  const getCustomerById = useCallback((id: string) => customers.find(c => c.id === id), [customers]);
  const getServiceById = useCallback((id: string) => services.find(s => s.id === id), [services]);
  const getDealById = useCallback((id: string) => deals.find(d => d.id === id), [deals]);
  const getChairById = useCallback((id: string) => chairs.find(c => c.id === id), [chairs]);
  const getInvoiceByBookingId = useCallback((bid: string) => invoices.find(i => i.bookingId === bid), [invoices]);

  // Toggle helper
  const toggle = (status: EntityStatus): EntityStatus => status === 'active' ? 'disabled' : 'active';

  // Staff CRUD
  const addStaff = (s: Omit<Staff, 'id' | 'createdAt'>) => setStaff(prev => [...prev, { ...s, id: genId(), createdAt: now() }]);
  const updateStaff = (id: string, s: Partial<Staff>) => setStaff(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
  const toggleStaffStatus = (id: string) => setStaff(prev => prev.map(x => x.id === id ? { ...x, status: toggle(x.status) } : x));
  const deleteStaff = (id: string) => setStaff(prev => prev.filter(x => x.id !== id));

  // Customer CRUD
  const addCustomer = (c: Omit<Customer, 'id' | 'createdAt'>) => setCustomers(prev => [...prev, { ...c, id: genId(), createdAt: now() }]);
  const updateCustomer = (id: string, c: Partial<Customer>) => setCustomers(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
  const toggleCustomerStatus = (id: string) => setCustomers(prev => prev.map(x => x.id === id ? { ...x, status: toggle(x.status) } : x));
  const deleteCustomer = (id: string) => setCustomers(prev => prev.filter(x => x.id !== id));

  // Service CRUD
  const addService = (s: Omit<Service, 'id'>) => setServices(prev => [...prev, { ...s, id: genId() }]);
  const updateService = (id: string, s: Partial<Service>) => setServices(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
  const toggleServiceStatus = (id: string) => setServices(prev => prev.map(x => x.id === id ? { ...x, status: toggle(x.status) } : x));
  const deleteService = (id: string) => setServices(prev => prev.filter(x => x.id !== id));

  // Deal CRUD
  const calcDealDuration = (serviceIds: string[]) => serviceIds.reduce((sum, sid) => {
    const svc = services.find(s => s.id === sid);
    return sum + (svc?.duration || 0);
  }, 0);

  const addDeal = (d: Omit<Deal, 'id' | 'totalDuration'>) => {
    setDeals(prev => [...prev, { ...d, id: genId(), totalDuration: calcDealDuration(d.serviceIds) }]);
  };
  const updateDeal = (id: string, d: Partial<Deal>) => setDeals(prev => prev.map(x => {
    if (x.id !== id) return x;
    const updated = { ...x, ...d };
    if (d.serviceIds) updated.totalDuration = calcDealDuration(d.serviceIds);
    return updated;
  }));
  const toggleDealStatus = (id: string) => setDeals(prev => prev.map(x => x.id === id ? { ...x, status: toggle(x.status) } : x));
  const deleteDeal = (id: string) => setDeals(prev => prev.filter(x => x.id !== id));

  // Overlap check
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

  // Generate invoice
  const generateInvoice = (booking: Booking): Invoice => {
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

    const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
    return {
      id: genId(),
      invoiceNumber: invNum,
      bookingId: booking.id,
      customerId: booking.customerId,
      staffId: booking.staffId,
      items,
      totalAmount: booking.totalPrice,
      createdAt: now(),
      status: 'unpaid',
    };
  };

  // Booking
  const addBooking = (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration'>) => {
    let totalPrice = 0;
    let totalDuration = 0;

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
    const booking: Booking = { ...b, id: genId(), createdAt: now(), endTime, totalPrice, totalDuration };
    setBookings(prev => [...prev, booking]);

    const invoice = generateInvoice(booking);
    setInvoices(prev => [...prev, invoice]);

    return booking;
  };

  const updateBookingStatus = (id: string, status: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const deleteBooking = (id: string) => setBookings(prev => prev.filter(b => b.id !== id));

  // Walk-in
  const createWalkIn = (b: Omit<Booking, 'id' | 'createdAt' | 'endTime' | 'totalPrice' | 'totalDuration' | 'status'>) => {
    return addBooking({ ...b, status: 'completed' });
  };

  return (
    <SalonContext.Provider value={{
      staff, customers, services, deals, chairs, bookings, invoices,
      addStaff, updateStaff, toggleStaffStatus, deleteStaff,
      addCustomer, updateCustomer, toggleCustomerStatus, deleteCustomer,
      addService, updateService, toggleServiceStatus, deleteService,
      addDeal, updateDeal, toggleDealStatus, deleteDeal,
      addBooking, updateBookingStatus, deleteBooking, checkOverlap,
      createWalkIn,
      getStaffById, getCustomerById, getServiceById, getDealById, getChairById, getInvoiceByBookingId,
    }}>
      {children}
    </SalonContext.Provider>
  );
};
