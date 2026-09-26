import { useEffect, useState } from 'react';
import { User, LogOut, Save, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { friendlyError } from '@/lib/errors';
import { toLocalDateKey } from '@/lib/format';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  max?: string;
  maxLength?: number;
  autoComplete?: string;
}

// Defined outside the page component: a component declared inside render is
// re-created on every keystroke, which remounts the input and drops focus.
const Field = ({ id, label, value, onChange, type = 'text', placeholder = '', max, maxLength, autoComplete }: FieldProps) => (
  <label className="block" htmlFor={id}>
    <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
    <input
      id={id}
      type={type}
      value={value}
      max={max}
      maxLength={maxLength}
      autoComplete={autoComplete}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
    />
  </label>
);

const AccountProfile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', birthday: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loyalty, setLoyalty] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) toast.error(friendlyError(error));
      if (data) {
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
          birthday: data.birthday || '',
        });
        setLoyalty(data.loyalty_points || 0);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    const name = form.full_name.trim();
    const phone = form.phone.trim();
    if (name.length < 2) return toast.error('Please enter your full name.');
    if (phone && (phone.replace(/\D/g, '').length < 7 || !/^[+\d][\d\s-]*$/.test(phone))) {
      return toast.error('Please enter a valid phone number.');
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: name,
      phone: phone || null,
      address: form.address.trim() || null,
      birthday: form.birthday || null,
    }).eq('id', user.id);
    if (error) {
      setSaving(false);
      return toast.error(friendlyError(error));
    }
    // Keep the salon's customer record in sync so staff see the new details.
    const custPatch: { name: string; phone?: string; address: string | null } = { name, address: form.address.trim() || null };
    if (phone) custPatch.phone = phone;
    const { error: custError } = await supabase.from('customers').update(custPatch).eq('user_id', user.id);
    setSaving(false);
    if (custError) toast.warning(`Profile saved, but the salon's copy wasn't updated: ${friendlyError(custError)}`);
    else toast.success('Profile updated');
  };

  const doSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <CustomerLayout title="Profile" subtitle="Personal details">
      {loading ? (
        <div className="grid lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading profile">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-muted animate-pulse" />
          <div className="h-48 bg-muted animate-pulse" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 surface-panel p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-[0_8px_24px_-8px_hsl(328_85%_55%/0.5)] shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-2xl font-bold truncate">{form.full_name || 'Your profile'}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field id="pf-name" label="Full name" autoComplete="name" maxLength={100} value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} />
              <Field id="pf-phone" label="Phone" type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="03xx-xxxxxxx" />
              <Field id="pf-birthday" label="Birthday" type="date" max={toLocalDateKey(new Date())} value={form.birthday} onChange={v => setForm(f => ({ ...f, birthday: v }))} />
              <Field id="pf-address" label="Address" autoComplete="street-address" maxLength={300} value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="City, area" />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-border/50">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 shadow-[0_8px_20px_-8px_hsl(328_85%_55%/0.6)]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Saving…' : 'Save changes'}
              </button>
              <Link
                to="/reset-password"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-muted"
              >
                Change password
              </Link>
              <button
                onClick={doSignOut}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted text-foreground text-sm font-semibold hover:bg-muted/70"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>

          <div className="surface-panel p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-medium">Glow Rewards</p>
            <p className="font-heading text-6xl font-light mt-4 tabular-nums">{loyalty}<span className="text-base opacity-60 ml-2">pts</span></p>
            <p className="text-sm text-muted-foreground mt-4 font-light leading-relaxed">Earn 10 points per completed visit. Save more with every glow-up.</p>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default AccountProfile;
