import Loader from '@/components/Loader';
import { useSetupStatus } from '@/features/setup/queries';
import LoginPage from '@/pages/LoginPage';
import ActivationPage from '@/pages/setup/ActivationPage';
import CreateAdminPage from '@/pages/setup/CreateAdminPage';

/** /login on a fresh install walks through the first-run steps before the login form. */
export default function LoginGate() {
  const { data: status, isLoading } = useSetupStatus();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size={1.25} label="Memuat…" />
      </div>
    );
  }
  if (status && !status.licensed) return <ActivationPage />;
  if (status && !status.has_admin) return <CreateAdminPage license={status.license} />;
  return <LoginPage />;
}
