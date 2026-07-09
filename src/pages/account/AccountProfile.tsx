import { useEffect, useState } from 'react';
import { User, LogOut, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      phone: form.phone || null,
      address: form.address || null,
      birthday: form.birthday || null,
    }).eq('id', user.id);
    // also mirror to customers row if exists
    await supabase.from('customers').update({
      name: form.full_name,
      phone: form.phone || '',
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated');
  };

  const doSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const Field = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
    <label className="block">
      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
      />
    </label>
  );

  return (
    <CustomerLayout title="Profile" subtitle="Personal details">
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-[0_8px_24px_-8px_hsl(328_85%_55%/0.5)]">
                <User className="w-7 h-7" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold">{form.full_name || 'Your profile'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full name" value={form.full_name} onChange={(v: string) => setForm(f => ({ ...f, full_name: v }))} />
              <Field label="Phone" value={form.phone} onChange={(v: string) => setForm(f => ({ ...f, phone: v }))} placeholder="03xx-xxxxxxx" />
              <Field label="Birthday" type="date" value={form.birthday} onChange={(v: string) => setForm(f => ({ ...f, birthday: v }))} />
              <Field label="Address" value={form.address} onChange={(v: string) => setForm(f => ({ ...f, address: v }))} placeholder="City, area" />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-border/50">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 shadow-[0_8px_20px_-8px_hsl(328_85%_55%/0.6)]"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={doSignOut}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted text-foreground text-sm font-semibold hover:bg-muted/70"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>

          <div className="border border-border/60 p-8 bg-muted/30">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-medium">Glow Rewards</p>
            <p className="font-heading text-6xl font-light mt-4 tabular-nums">{loyalty}<span className="text-base opacity-60 ml-2">pts</span></p>
            <p className="text-sm text-muted-foreground mt-4 font-light leading-relaxed">Earn 10 points per completed visit. Save more with every glow-up.</p>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default AccountProfile;
