import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/salon';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoaded: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  /** Owners and managers can delete records and manage the team. */
  canManage: boolean;
  /** True after the user opened a password-reset link. */
  passwordRecovery: boolean;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const linkedFor = useRef<string | null>(null);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid);
    const loaded = (data || []).map(r => r.role as AppRole);
    setRoles(loaded);
    setRolesLoaded(true);
    // Customers get a customer record linked to their login so the portal
    // can show their bookings and invoices. Idempotent on the server.
    if (loaded.length === 0 && linkedFor.current !== uid) {
      linkedFor.current = uid;
      await supabase.rpc('ensure_customer_record');
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt, sess) => {
      if (evt === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setRolesLoaded(false);
        // Deferred: calling Supabase inside this callback can deadlock the client.
        setTimeout(() => loadRoles(sess.user.id), 0);
      } else {
        setRoles([]);
        setRolesLoaded(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadRoles(sess.user.id);
      else setRolesLoaded(true);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { full_name: fullName.trim(), phone: phone?.trim() || null },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    linkedFor.current = null;
    setPasswordRecovery(false);
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setPasswordRecovery(false);
    return { error: error?.message ?? null };
  };

  const isStaff = roles.length > 0;
  const canManage = roles.includes('owner') || roles.includes('manager');

  return (
    <AuthContext.Provider value={{
      user, session, roles, loading, rolesLoaded,
      isStaff,
      isCustomer: !!user && rolesLoaded && !isStaff,
      canManage,
      passwordRecovery,
      hasRole: (r) => roles.includes(r),
      signIn, signUp, signOut, sendPasswordReset, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
