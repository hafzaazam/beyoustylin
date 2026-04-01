import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Zap, Search, Trash2 } from 'lucide-react';
import { BookingStatus } from '@/types/salon';

const BookingsPage = () => {
  const salon = useSalon();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [form, setForm] = useState({
    customerId: '', staffId: '', chairId: '', serviceIds: [] as string[], dealId: '', startTime: '', useDeal: false,
  });

  const resetForm = () => setForm({ customerId: '', staffId: '', chairId: '', serviceIds: [], dealId: '', startTime: '', useDeal: false });

  const handleSubmit = (isWalkIn = false) => {
    if (!form.customerId || !form.staffId || !form.chairId || !form.startTime) {
      toast({ title: 'Missing fields', description: 'Fill all required fields.', variant: 'destructive' });
      return;
    }
    if (!form.useDeal && form.serviceIds.length === 0) {
      toast({ title: 'No services', description: 'Select at least one service or a deal.', variant: 'destructive' });
      return;
    }

    const bookingData = {
      customerId: form.customerId,
      staffId: form.staffId,
      chairId: form.chairId,
      serviceIds: form.useDeal ? [] : form.serviceIds,
      dealId: form.useDeal ? form.dealId : undefined,
      startTime: new Date(form.startTime).toISOString(),
    };

    const result = isWalkIn
      ? salon.createWalkIn(bookingData)
      : salon.addBooking({ ...bookingData, status: 'pending' as BookingStatus });

    if (typeof result === 'string') {
      toast({ title: 'Booking Conflict', description: result, variant: 'destructive' });
    } else {
      toast({ title: isWalkIn ? 'Walk-in Created' : 'Booking Created', description: `Invoice auto-generated.` });
      resetForm();
      setOpen(false);
      setWalkInOpen(false);
    }
  };

  const toggleService = (id: string) => {
    setForm(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id) ? prev.serviceIds.filter(s => s !== id) : [...prev.serviceIds, id]
    }));
  };

  const filteredBookings = salon.bookings.filter(b => {
    const customer = salon.getCustomerById(b.customerId);
    const matchSearch = !search || customer?.name.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  }).reverse();

  const activeStaff = salon.staff.filter(s => s.status === 'active');
  const activeServices = salon.services.filter(s => s.status === 'active');
  const activeDeals = salon.deals.filter(d => d.status === 'active');
  const activeCustomers = salon.customers.filter(c => c.status === 'active');
  const activeChairs = salon.chairs.filter(c => c.status === 'active');

  const BookingForm = ({ isWalkIn = false }: { isWalkIn?: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <Label>Customer *</Label>
        <Select value={form.customerId} onValueChange={v => setForm(p => ({ ...p, customerId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
          <SelectContent>{activeCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Staff *</Label>
        <Select value={form.staffId} onValueChange={v => setForm(p => ({ ...p, staffId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
          <SelectContent>{activeStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Chair/Slot *</Label>
        <Select value={form.chairId} onValueChange={v => setForm(p => ({ ...p, chairId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select chair" /></SelectTrigger>
          <SelectContent>{activeChairs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Start Time *</Label>
        <Input type="datetime-local" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
      </div>
      <div className="flex items-center gap-3">
        <Label>Use Deal?</Label>
        <input type="checkbox" checked={form.useDeal} onChange={e => setForm(p => ({ ...p, useDeal: e.target.checked }))} className="rounded" />
      </div>
      {form.useDeal ? (
        <div>
          <Label>Deal</Label>
          <Select value={form.dealId} onValueChange={v => setForm(p => ({ ...p, dealId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select deal" /></SelectTrigger>
            <SelectContent>{activeDeals.map(d => <SelectItem key={d.id} value={d.id}>{d.name} - ${d.discountedPrice}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <Label>Services</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {activeServices.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                className={`p-2 rounded-lg border text-left text-sm transition-colors ${
                  form.serviceIds.includes(s.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                <span className="font-medium">{s.name}</span>
                <span className="block text-xs text-muted-foreground">${s.price} · {s.duration}min</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Button className="w-full" onClick={() => handleSubmit(isWalkIn)}>
        {isWalkIn ? 'Create Walk-in & Invoice' : 'Create Booking'}
      </Button>
    </div>
  );

  const statuses: BookingStatus[] = ['pending', 'confirmed', 'started', 'completed', 'canceled'];

  return (
    <AdminLayout title="Bookings">
      <div className="flex flex-wrap gap-3 mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />New Booking</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">Create Booking</DialogTitle></DialogHeader>
            <BookingForm />
          </DialogContent>
        </Dialog>
        <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={resetForm}><Zap className="w-4 h-4 mr-2" />Walk-in Order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">Walk-in Order (Live)</DialogTitle></DialogHeader>
            <BookingForm isWalkIn />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Chair</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No bookings found.</td></tr>
              ) : filteredBookings.map(b => {
                const customer = salon.getCustomerById(b.customerId);
                const staffMember = salon.getStaffById(b.staffId);
                const chair = salon.getChairById(b.chairId);
                return (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">#{b.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{customer?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{staffMember?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{chair?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs">{new Date(b.startTime).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">${b.totalPrice}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Select value={b.status} onValueChange={v => salon.updateBookingStatus(b.id, v as BookingStatus)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => salon.deleteBooking(b.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BookingsPage;
