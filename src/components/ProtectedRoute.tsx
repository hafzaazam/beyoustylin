import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Spinner = () => (
  <div className="min-h-screen grid place-items-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" />
  </div>
);

/** Sends signed-out visitors to /auth and remembers where they were going. */
const useSignInRedirect = () => {
  const location = useLocation();
  return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
};

// Admin/staff-only guard. Redirects customers to their own dashboard.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isStaff, rolesLoaded } = useAuth();
  const toSignIn = useSignInRedirect();
  if (loading) return <Spinner />;
  if (!user) return toSignIn;
  if (!rolesLoaded) return <Spinner />;
  if (!isStaff) return <Navigate to="/account" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;

// Owner/manager-only pages (team and access management).
export const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isStaff, canManage, rolesLoaded } = useAuth();
  const toSignIn = useSignInRedirect();
  if (loading) return <Spinner />;
  if (!user) return toSignIn;
  if (!rolesLoaded) return <Spinner />;
  if (!isStaff) return <Navigate to="/account" replace />;
  if (!canManage) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

// Customer / signed-in user guard.
export const CustomerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isStaff, rolesLoaded } = useAuth();
  const toSignIn = useSignInRedirect();
  if (loading) return <Spinner />;
  if (!user) return toSignIn;
  if (!rolesLoaded) return <Spinner />;
  if (isStaff) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};
