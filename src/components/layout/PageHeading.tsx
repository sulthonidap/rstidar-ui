import { useOrganization } from '@/features/organizations/queries';
import { useAuth } from '@/lib/auth';

const PAGE_HEADINGS: Record<string, { title: string; description: string }> = {
  '/orders': {
    title: 'Order',
    description: 'Daftar order pengiriman beserta statusnya.',
  },
  '/pengaturan/pembayaran': {
    title: 'Pengaturan Pembayaran',
    description: 'Rekening bank dan QRIS untuk order yang dibayar non-tunai.',
  },
  '/rekap': {
    title: 'Rekap',
    description: 'Rekap order harian dan bulanan: jumlah per status, waktu proses, layanan, dan pendapatan.',
  },
  '/customers': {
    title: 'Customer',
    description: 'Daftar customer tersimpan, tinggal dipilih waktu bikin order internal.',
  },
  '/couriers': {
    title: 'Rekap Kurir',
    description: 'Kinerja tiap kurir per bulan atau tahun: order yang ditugaskan, selesai, jarak tempuh, dan waktu antar.',
  },
  '/pengaturan/rs': {
    title: 'Profil RS',
    description: 'Data RS, titik lokasi pickup, dan wilayah layanan pengiriman.',
  },
  '/services': {
    title: 'Tipe Layanan',
    description: 'Atur jenis layanan pengiriman dan tarifnya.',
  },
  '/pengaturan/wilayah': {
    title: 'Wilayah Layanan',
    description: 'Kabupaten/kota dan kecamatan yang dilayani. Alamat di luar wilayah ini ditolak.',
  },
  '/pengaturan/bangsal': {
    title: 'Bangsal',
    description: 'Daftar bangsal rawat inap, dipilih saat order dari farmasi rawat inap.',
  },
  '/users': {
    title: 'Kelola User',
    description: 'Tambah, ubah, dan atur role akun pengguna.',
  },
  '/transactions': {
    title: 'Laporan Transaksi',
    description: 'Rekap pembayaran dan status pelunasan order.',
  },
};

function DashboardGreeting() {
  const { user } = useAuth();
  const { data: organization } = useOrganization();

  return (
    <div>
      <h2 className="text-2xl font-bold">Halo, {user?.name?.split(' ')[0]} 👋</h2>
      <p className="text-sm text-muted-foreground">
        Login sebagai <span className="font-medium text-foreground">{user?.role?.label ?? user?.role?.name}</span>
        {organization ? <> · {organization.name}</> : null}
      </p>
    </div>
  );
}

/** Heading shown above each admin page; pages with their own heading (e.g. order detail) get none. */
export function PageHeading({ pathname }: { pathname: string }) {
  if (pathname === '/') return <DashboardGreeting />;

  const heading = PAGE_HEADINGS[pathname];
  if (!heading) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold">{heading.title}</h2>
      <p className="text-sm text-muted-foreground">{heading.description}</p>
    </div>
  );
}
