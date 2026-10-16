import { BadgeCheckIcon, Building2Icon, ScanQrCodeIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';

import Loader from '@/components/Loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/features/organizations/queries';
import LicenseCard from '@/pages/settings/LicenseCard';
import OrganizationForm from '@/pages/settings/OrganizationForm';
import ShareLinksCard from '@/pages/settings/ShareLinksCard';

const TABS = ['profil', 'link', 'lisensi'] as const;
// The active tab filled with the brand color (the default is a white pill, black text).
const TAB =
  'data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground';

type Tab = (typeof TABS)[number];

/**
 * Pengaturan → Profil RS (Admin), in tabs: the partner RS's details (map
 * point, service area), the public links & QR, and the license. The tab is
 * kept in the URL (?tab=link) so it can be linked to directly.
 */
export default function OrganizationSettingsPage() {
  const { data: organization, isLoading } = useOrganization();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get('tab')) ?? 'profil';

  if (isLoading) return <Loader label="Memuat profil RS…" />;

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setParams(v === 'profil' ? {} : { tab: v }, { replace: true })}
      className="max-w-3xl gap-4"
    >
      <TabsList className="w-full">
        <TabsTrigger value="profil" className={TAB}>
          <Building2Icon />
          Profil RS
        </TabsTrigger>
        <TabsTrigger value="link" className={TAB} disabled={!organization}>
          <ScanQrCodeIcon />
          Link & QR
        </TabsTrigger>
        <TabsTrigger value="lisensi" className={TAB}>
          <BadgeCheckIcon />
          Lisensi
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profil">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil RS</CardTitle>
            <CardDescription>Tampil di form order, label pengiriman, dan laporan.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationForm organization={organization ?? null} submitLabel="Simpan" />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="link">{organization && <ShareLinksCard rsName={organization.name} />}</TabsContent>
      <TabsContent value="lisensi">
        <LicenseCard />
      </TabsContent>
    </Tabs>
  );
}
