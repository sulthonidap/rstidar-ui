import { LogOutIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import OrganizationForm from '@/pages/settings/OrganizationForm';
import SetupShell from '@/pages/setup/SetupShell';

/**
 * First run, step 3 — shown instead of the panel until the partner RS profile
 * exists: the admin fills it in (once); other staff are asked to wait.
 */
export default function OrganizationSetupPage() {
  const { user, logout } = useAuth();
  const isAdmin = hasRole(user, 'admin');

  return (
    <SetupShell
      step={3}
      wide={isAdmin}
      title="Profil RS"
      description={
        isAdmin
          ? 'Titik lokasi RS dipakai sebagai titik pickup dan acuan jarak. Bisa diubah lagi di Profil RS.'
          : 'Admin perlu melengkapi profil RS dulu. Hubungi admin, lalu muat ulang halaman ini.'
      }
    >
      {isAdmin && <OrganizationForm organization={null} submitLabel="Simpan & mulai" />}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOutIcon />
          Keluar
        </Button>
      </div>
    </SetupShell>
  );
}
