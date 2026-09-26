import { AppointmentRequestStatus, BookingStatus, EntityStatus, InvoiceStatus } from '@/types/salon';

type AnyStatus = BookingStatus | EntityStatus | InvoiceStatus | AppointmentRequestStatus;

const classMap: Record<AnyStatus, string> = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  started: 'status-started',
  completed: 'status-completed',
  canceled: 'status-canceled',
  active: 'status-completed',
  disabled: 'status-canceled',
  paid: 'status-completed',
  unpaid: 'status-pending',
  void: 'status-muted',
  approved: 'status-completed',
  dismissed: 'status-muted',
  withdrawn: 'status-muted',
};

const labelMap: Partial<Record<AnyStatus, string>> = {
  started: 'In progress',
};

export const StatusBadge = ({ status }: { status: AnyStatus }) => (
  <span className={`status-badge ${classMap[status] ?? ''}`}>
    {labelMap[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);
