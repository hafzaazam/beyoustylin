import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSalon } from '@/context/SalonContext';

const statusClass: Record<string, string> = {
  pending: 'bg-warning/10 text-warning ring-warning/30',
  approved: 'bg-success/10 text-success ring-success/30',
  dismissed: 'bg-muted text-muted-foreground ring-border',
};

const AccountRequests = () => {
  const { user } = useAuth();
  const { services, deals } = useSalon();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('appointment_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, [user]);

  const label = (r: any) => {
    if (r.deal_id) return deals.find(d => d.id === r.deal_id)?.name || 'Package';
    if (r.service_id) return services.find(s => s.id === r.service_id)?.name || 'Service';
    return r.type === 'quote' ? 'Custom quote' : 'General booking';
  };

  return (
    <CustomerLayout title="My Requests" subtitle="Booking & Quotes">
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <Inbox className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-heading text-xl font-semibold mb-1">No requests yet</p>
          <p className="text-sm text-muted-foreground">Submit a booking or quote from the landing page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.type}</span>
                  <h3 className="font-heading text-lg font-semibold">{label(r)}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(r.created_at).toLocaleDateString()}
                  {r.preferred_date && ` · Preferred ${r.preferred_date}${r.preferred_time ? ` at ${r.preferred_time}` : ''}`}
                  {r.event_date && ` · Event ${r.event_date}`}
                </p>
                {r.notes && <p className="text-sm text-muted-foreground mt-1 italic">"{r.notes}"</p>}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ring-1 ring-inset ${statusClass[r.status] || ''}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
};

export default AccountRequests;
