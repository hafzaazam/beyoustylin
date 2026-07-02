import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Spinner = () => (
  <div className="min-h-screen grid place-items-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

// Admin/staff-only guard. Redirects customers to their own dashboard.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isStaff, rolesLoaded } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!rolesLoaded) return <Spinner />;
  if (!isStaff) return <Navigate to="/account" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;

// Customer / signed-in user guard.
export const CustomerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isStaff, rolesLoaded } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!rolesLoaded) return <Spinner />;
  if (isStaff) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};
