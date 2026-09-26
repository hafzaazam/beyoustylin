import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarCheck, MailOpen, Undo2 } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useSalon } from '@/context/SalonContext';
import { useConfirm } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/errors';
import { formatDate } from '@/lib/format';

type RequestRow = Tables<'appointment_requests'>;

const AccountRequests = () => {
  const { user } = useAuth();
  const { services, deals } = useSalon();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('appointment_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(friendlyError(error));
    setRows(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const label = (r: RequestRow) => {
    if (r.deal_id) return deals.find(d => d.id === r.deal_id)?.name || 'Package';
    if (r.service_id) return services.find(s => s.id === r.service_id)?.name || 'Service';
    return r.type === 'quote' ? 'Custom quote' : 'General booking';
  };

  const withdraw = (r: RequestRow) => confirm({
    title: 'Withdraw this request?',
    description: `Your ${r.type === 'quote' ? 'quote' : 'booking'} request for ${label(r)} will be withdrawn and the salon won't contact you about it.`,
    confirmLabel: 'Withdraw request',
    destructive: true,
    onConfirm: async () => {
      const { error } = await supabase.rpc('withdraw_my_request', { _request_id: r.id });
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Request withdrawn.');
      await load();
    },
  });

  return (
    <CustomerLayout title="My Requests" subtitle="Booking & Quotes">
      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading requests">
          {[0, 1].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/60">
          <MailOpen className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-heading text-xl font-semibold mb-1">No requests yet</p>
          <p className="text-sm text-muted-foreground mb-5">Submit a booking or quote request and track it here.</p>
          <Link to="/#book"><Button>Request an appointment</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.type}</span>
                  <h3 className="font-heading text-lg font-semibold">{label(r)}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDate(r.created_at)}
                  {r.preferred_date && ` · Preferred ${formatDate(r.preferred_date)}${r.preferred_time ? ` at ${r.preferred_time.slice(0, 5)}` : ''}`}
                  {r.event_date && ` · Event ${formatDate(r.event_date)}`}
                </p>
                {r.notes && <p className="text-sm text-muted-foreground mt-1 italic break-words">"{r.notes}"</p>}
                {r.booking_id && (
                  <Link to="/account/appointments" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <CalendarCheck className="w-3.5 h-3.5" /> Booked — view appointment
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === 'pending' && (
                  <Button variant="ghost" size="sm" onClick={() => withdraw(r)}>
                    <Undo2 className="w-4 h-4 mr-1" /> Withdraw
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </CustomerLayout>
  );
};

export default AccountRequests;
