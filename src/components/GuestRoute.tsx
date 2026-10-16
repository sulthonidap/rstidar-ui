import { Navigate, useLocation } from 'react-router';

import Loader from '@/components/Loader';
import { useAuth } from '@/lib/auth';
import { nextPath } from '@/lib/session';

/**
 * For pages only logged-out visitors need (login): a logged-in user goes on to
 * the ?next= page (where they were before logging in), else the dashboard.
 */
export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { search } = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size={1.25} label="Memeriksa sesi login…" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={nextPath(search)} replace />;
  }

  return <>{children}</>;
}
