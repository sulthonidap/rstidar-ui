import { Navigate, useLocation } from 'react-router';

import Loader from '@/components/Loader';
import { useOrganization } from '@/features/organizations/queries';
import { useAuth } from '@/lib/auth';
import { loginUrl, sessionExpiredOnStart, isLoggedOut } from '@/lib/session';
import OrganizationSetupPage from '@/pages/settings/OrganizationSetupPage';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  // The panel needs the partner RS; until it's set up, show the setup page instead.
  const organization = useOrganization({ enabled: !!user });

  if (isLoading || (user && organization.isLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size={1.25} label="Memeriksa sesi login…" />
      </div>
    );
  }

  if (!user) {
    // After "Keluar": a plain login page, the next account starts at the Dashboard.
    if (isLoggedOut()) return <Navigate to="/login" replace />;
    // Otherwise come back to this page after logging in (e.g. an order link opened from WhatsApp).
    return <Navigate to={loginUrl(location.pathname + location.search, sessionExpiredOnStart())} replace />;
  }

  if (organization.isSuccess && !organization.data) {
    return <OrganizationSetupPage />;
  }

  return <>{children}</>;
}
