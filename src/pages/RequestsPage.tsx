import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Check, X, Trash2, Inbox, Phone, Mail, Calendar, Clock } from 'lucide-react';
import { AppointmentRequestStatus } from '@/types/salon';

const statusStyles: Record<AppointmentRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

const RequestsPage = () => {
  const salon = useSalon();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | AppointmentRequestStatus>('all');

  const filtered = useMemo(() => {
    return salon.appointmentRequests.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.email || '').toLowerCase().includes(q);
    });
  }, [salon.appointmentRequests, search, filter]);

  const labelForItem = (r: typeof salon.appointmentRequests[number]) => {
    if (r.dealId) return salon.getDealById(r.dealId)?.name || 'Package';
    if (r.serviceId) return salon.getServiceById(r.serviceId)?.name || 'Service';
    return 'General inquiry';
  };

  const counts = {
    all: salon.appointmentRequests.length,
    pending: salon.appointmentRequests.filter(r => r.status === 'pending').length,
    approved: salon.appointmentRequests.filter(r => r.status === 'approved').length,
    dismissed: salon.appointmentRequests.filter(r => r.status === 'dismissed').length,
  };

  return (
    <AdminLayout title="Appointment Requests">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'pending', 'approved', 'dismissed'] as const).map(key => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                  filter === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {key} <span className="opacity-70">({counts[key]})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, phone, email" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-2xl bg-card">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">No appointment requests</p>
            <p className="text-sm text-muted-foreground mt-1">
              Requests submitted from the public site will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(r => (
              <div key={r.id} className="p-5 rounded-2xl border border-border bg-card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold border ${
                        r.type === 'quote'
                          ? 'bg-violet-100 text-violet-800 border-violet-200'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {r.type === 'quote' ? 'Quote' : 'Booking'}
                      </span>
                    </div>
                    <h3 className="font-heading text-lg font-semibold">{r.name}</h3>
                    <p className="text-sm text-primary font-medium">{labelForItem(r)}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border font-semibold ${statusStyles[r.status]}`}>
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {r.phone}</div>
                  {r.email && <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5" /> <span className="truncate">{r.email}</span></div>}
                  {r.type === 'booking' ? (
                    <>
                      {r.preferredDate && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {r.preferredDate}</div>}
                      {r.preferredTime && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {r.preferredTime}</div>}
                    </>
                  ) : (
                    <>
                      {r.eventDate && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Event: {r.eventDate}</div>}
                      {r.budget && <div className="flex items-center gap-2 truncate">💰 <span className="truncate">{r.budget}</span></div>}
                    </>
                  )}
                </div>

                {r.notes && (
                  <p className="text-sm bg-muted/50 rounded-lg p-3 mb-4 border border-border/60 whitespace-pre-wrap">
                    {r.notes}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 justify-between items-center pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Submitted {new Date(r.createdAt).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    {r.status !== 'approved' && (
                      <Button size="sm" onClick={() => { salon.updateAppointmentRequestStatus(r.id, 'approved'); toast({ title: 'Request approved' }); }}>
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                    )}
                    {r.status !== 'dismissed' && (
                      <Button size="sm" variant="outline" onClick={() => { salon.updateAppointmentRequestStatus(r.id, 'dismissed'); toast({ title: 'Request dismissed' }); }}>
                        <X className="w-4 h-4" /> Dismiss
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this request?')) { salon.deleteAppointmentRequest(r.id); toast({ title: 'Request deleted' }); } }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RequestsPage;
