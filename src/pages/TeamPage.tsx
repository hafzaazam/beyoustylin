import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { friendlyError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { AppRole } from '@/types/salon';

interface Member {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  since: string;
}

const ROLES: { value: AppRole; label: string; description: string; ownerOnly?: boolean }[] = [
  { value: 'owner', label: 'Owner', description: 'Everything, including managing the team and other owners.', ownerOnly: true },
  { value: 'manager', label: 'Manager', description: 'Everything including deletes and team access, except changing owners.', ownerOnly: true },
  { value: 'receptionist', label: 'Receptionist', description: 'Bookings, requests, customers and invoices. Cannot delete records.' },
  { value: 'stylist', label: 'Stylist', description: 'Bookings, customers and invoices. Cannot delete records.' },
];

const roleBadge: Record<AppRole, string> = {
  owner: 'bg-primary/15 text-primary ring-primary/25',
  manager: 'bg-info/10 text-info ring-info/20',
  receptionist: 'bg-success/10 text-success ring-success/20',
  stylist: 'bg-warning/10 text-warning ring-warning/20',
};

const TeamPage = () => {
  const { user, hasRole } = useAuth();
  const isOwner = hasRole('owner');
  const { confirm, dialog } = useConfirm();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('receptionist');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_team_members');
    if (error) toast.error(friendlyError(error));
    setMembers((data || []).map(m => ({
      userId: m.user_id, email: m.email, fullName: m.full_name, role: m.role, since: m.created_at,
    })).sort((a, b) => a.since.localeCompare(b.since)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ownerCount = members.filter(m => m.role === 'owner').length;
  const assignable = ROLES.filter(r => isOwner || !r.ownerOnly);

  const setMemberRole = async (targetEmail: string, newRole: AppRole) => {
    const { error } = await supabase.rpc('set_member_role', { _email: targetEmail, _role: newRole });
    if (error) { toast.error(friendlyError(error)); return false; }
    return true;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) { toast.error('Enter a valid email address'); return; }
    setAdding(true);
    const ok = await setMemberRole(trimmed, role);
    setAdding(false);
    if (ok) {
      toast.success(`${trimmed} now has ${role} access`);
      setEmail('');
      load();
    }
  };

  const changeRole = async (m: Member, newRole: AppRole) => {
    if (newRole === m.role) return;
    setBusyId(m.userId);
    const ok = await setMemberRole(m.email, newRole);
    setBusyId(null);
    if (ok) { toast.success(`Role updated for ${m.fullName || m.email}`); load(); }
  };

  const remove = (m: Member) => confirm({
    title: `Remove ${m.fullName || m.email} from the team?`,
    description: 'They keep their login but lose access to the admin panel. Their account becomes a normal customer account.',
    confirmLabel: 'Remove access',
    destructive: true,
    onConfirm: async () => {
      const { error } = await supabase.rpc('remove_team_member', { _user_id: m.userId });
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Access removed');
      load();
    },
  });

  // Managers can't touch owners/managers; nobody can demote/remove the last owner.
  const locked = (m: Member) =>
    (!isOwner && (m.role === 'owner' || m.role === 'manager')) || (m.role === 'owner' && ownerCount <= 1);

  return (
    <AdminLayout title="Team & Access">
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-card rounded-2xl border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold">Team members</h3>
            <span className="text-xs text-muted-foreground">{members.length} with admin access</span>
          </div>
          {loading ? (
            <div className="p-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : members.length === 0 ? (
            <div className="p-5"><EmptyState icon={ShieldCheck} title="No team members" description="Add a team member using the form." /></div>
          ) : (
            <ul className="divide-y">
              {members.map(m => {
                const isSelf = m.userId === user?.id;
                const isLocked = locked(m);
                return (
                  <li key={m.userId} className="px-5 py-4 flex flex-wrap items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0"
                      style={{ background: 'var(--gradient-primary)' }}
                      aria-hidden
                    >
                      {(m.fullName || m.email)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-[10rem]">
                      <p className="font-medium truncate">
                        {m.fullName || m.email.split('@')[0]}
                        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.email} · since {formatDate(m.since)}</p>
                    </div>
                    {isLocked ? (
                      <span className={`status-badge capitalize ${roleBadge[m.role]}`} title={m.role === 'owner' && ownerCount <= 1 ? 'The last owner cannot be changed' : 'Only an owner can change this member'}>
                        {m.role}
                      </span>
                    ) : (
                      <Select value={m.role} onValueChange={v => changeRole(m, v as AppRole)} disabled={busyId === m.userId}>
                        <SelectTrigger className="w-36 h-8 text-xs" aria-label={`Role for ${m.email}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {assignable.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={isLocked || busyId === m.userId}
                      onClick={() => remove(m)}
                      aria-label={`Remove ${m.email}`}
                      title="Remove access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <form onSubmit={add} className="bg-card rounded-2xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg font-semibold">Add team member</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The person must first create an account on the sign-in page. Granting a role turns their customer account into staff access.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">Email</Label>
              <Input id="member-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={v => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{assignable.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={adding}>
              {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Grant access
            </Button>
          </form>

          <div className="bg-card rounded-2xl border p-5">
            <h3 className="font-heading text-lg font-semibold mb-3">What each role can do</h3>
            <dl className="space-y-3 text-sm">
              {ROLES.map(r => (
                <div key={r.value}>
                  <dt><span className={`status-badge ${roleBadge[r.value]}`}>{r.label}</span></dt>
                  <dd className="text-muted-foreground mt-1">{r.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
      {dialog}
    </AdminLayout>
  );
};

export default TeamPage;
