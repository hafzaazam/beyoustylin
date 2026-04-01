import { BookingStatus, EntityStatus } from '@/types/salon';

export const StatusBadge = ({ status }: { status: BookingStatus | EntityStatus | 'paid' | 'unpaid' }) => {
  const classMap: Record<string, string> = {
    pending: 'status-badge status-pending',
    confirmed: 'status-badge status-confirmed',
    started: 'status-badge status-started',
    completed: 'status-badge status-completed',
    canceled: 'status-badge status-canceled',
    active: 'status-badge status-completed',
    disabled: 'status-badge status-canceled',
    paid: 'status-badge status-completed',
    unpaid: 'status-badge status-pending',
  };

  return (
    <span className={classMap[status] || 'status-badge'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
