import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SITE } from '@/config/site';

// Supabase signs the user in with a short-lived recovery session when they
// open the emailed link (redirectTo = /reset-password), so updateUser works here.
const ResetPassword = () => {
  usePageTitle('Choose a new password');
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters.');
    if (password !== confirm) return toast.error('The two passwords do not match.');
    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    if (error) return toast.error(error);
    toast.success('Password updated. You are signed in.');
    navigate('/account', { replace: true }); // staff are redirected to /admin by the guard
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Choose a new password</h1>
            <p className="text-xs text-muted-foreground">{SITE.name}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-primary" aria-label="Loading" /></div>
        ) : !user ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link to="/auth"><Button className="w-full">Back to sign in</Button></Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
