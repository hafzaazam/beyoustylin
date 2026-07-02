export type BookingStatus = 'pending' | 'confirmed' | 'started' | 'completed' | 'canceled';
export type EntityStatus = 'active' | 'disabled';

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number; // minutes
  status: EntityStatus;
}

export interface Deal {
  id: string;
  name: string;
  serviceIds: string[];
  discountedPrice: number;
  totalDuration: number; // auto-calculated
  status: EntityStatus;
}

export interface Chair {
  id: string;
  name: string;
  status: EntityStatus;
}

export interface Booking {
  id: string;
  customerId: string;
  staffId: string;
  chairId: string;
  serviceIds: string[];
  dealId?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  totalPrice: number;
  totalDuration: number; // minutes
  status: BookingStatus;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  customerId: string;
  staffId: string;
  items: InvoiceItem[];
  totalAmount: number;
  createdAt: string;
  status: 'paid' | 'unpaid';
}

export interface InvoiceItem {
  name: string;
  price: number;
  type: 'service' | 'deal';
}

export type AppointmentRequestStatus = 'pending' | 'approved' | 'dismissed';

export interface AppointmentRequest {
  id: string;
  name: string;
  phone: string;
  email?: string;
  serviceId?: string;
  dealId?: string;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: string; // HH:MM
  notes?: string;
  status: AppointmentRequestStatus;
  createdAt: string;
}

export const SERVICE_CATEGORIES = [
  'Makeup', 'Hair Cutting', 'Hair Treatment', 'Mehndi', 'Wax', 'Threading', 'Nails', 'Facial', 'Add-on', 'Other'
];

export const STAFF_ROLES = [
  'Hairdresser', 'Makeup Artist', 'Nail Technician', 'Esthetician', 'Spa Therapist', 'Other'
];
