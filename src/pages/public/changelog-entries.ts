/**
 * What's new in the app, newest first — shown on /changelog. Videos and their
 * poster images live in public/changelog-media/.
 */
export interface ChangelogItem {
  kind: 'fitur' | 'perbaikan';
  title: string;
  summary?: string;
  points?: string[];
  /** File name in public/changelog-media/ without extension: <name>.mp4 + <name>.jpg (poster). */
  video?: string;
}

export interface ChangelogRelease {
  /** ISO date, e.g. "2026-10-30". */
  date: string;
  items: ChangelogItem[];
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    date: '2026-10-30',
    items: [
      {
        kind: 'fitur',
        title: 'Program ongkir gratis untuk pasien lansia & disabilitas',
        summary:
          'Pasien lansia (60+) dan penyandang disabilitas yang berdomisili Kota Magelang tidak membayar ongkir, setelah petugas mengecek KTP-nya.',
        points: [
          'Admin menyalakannya terpisah untuk form petugas dan untuk form pasien & kiosk (Pengaturan → Pembayaran).',
          'Di form petugas: petugas mengecek KTP lalu memilih Lansia/Disabilitas, ongkir langsung gratis.',
          'Di form pasien & kiosk: pilihan pasien baru berupa pengajuan, ditandai "Ajukan gratis" di daftar order.',
          'CCO menyetujui atau menolak lewat tombol biru "Cek pengajuan gratis" (di daftar order maupun detail order).',
          'Disetujui: ongkir Rp0 dan pembayaran otomatis lunas; biaya normal tetap tercatat untuk laporan. Ditolak: jadi order biasa.',
        ],
        video: '2-ongkir-gratis',
      },
      {
        kind: 'perbaikan',
        title: 'Perbaikan kecil',
        points: [
          'Kelurahan tidak lagi terhapus saat titik peta dipasang di kecamatan lain.',
          'Membatalkan order gratis (Rp0) tidak lagi menanyakan refund.',
          'Peta Wilayah Layanan di Admin hanya menampilkan wilayah yang dipilih.',
        ],
      },
    ],
  },
  {
    date: '2026-10-29',
    items: [
      {
        kind: 'fitur',
        title: 'Wilayah layanan',
        summary: 'Order hanya bisa dikirim ke kelurahan/desa di wilayah yang dilayani RS; di luar itu ditolak.',
        points: [
          'Admin memilih kabupaten/kota atau kecamatan yang dilayani (Pengaturan → Wilayah Layanan), lengkap dengan peta batas kelurahan.',
          'Di form pasien, kiosk, dan form petugas: pilih Kab/Kota → Kecamatan → Kelurahan, hanya wilayah yang dilayani yang muncul.',
          'Titik lokasi di peta otomatis mengisi kelurahannya; area di luar layanan diarsir gelap dan titik di sana ditolak.',
          'Ongkir tetap dihitung dari jarak seperti sebelumnya.',
        ],
        video: '1-wilayah-layanan',
      },
      {
        kind: 'fitur',
        title: 'Farmasi: asal resep di setiap order',
        summary: 'Petugas farmasi langsung tahu resep dari mana.',
        points: [
          'Rawat jalan: isi no. antrian farmasi. Rawat inap: pilih bangsal.',
          'Master data bangsal bisa dikelola Admin (Pengaturan → Bangsal).',
          'Kolom Farmasi tampil di daftar order, detail order, dan label paket.',
          'Di form pasien & kiosk bisa dinyalakan/dimatikan Admin; di form petugas selalu wajib.',
        ],
        video: '3-farmasi',
      },
    ],
  },
  {
    date: '2026-10-28',
    items: [
      {
        kind: 'fitur',
        title: 'Privasi data pasien & halaman lacak',
        summary: 'Data pasien disamarkan, dan pasien bisa memantau ordernya tanpa login.',
        points: [
          'Nama, nomor HP, no. rekam medis, dan alamat disamarkan di daftar, detail, dan label paket.',
          'Data lengkap hanya untuk kurir saat mengantar dan di potongan bawah label (arsip RS).',
          'Halaman /lacak: cukup masukkan kode order. Sebelum kurir memindai paket tampil "Dalam pengemasan".',
        ],
        video: '4-privasi-dan-lacak',
      },
      {
        kind: 'perbaikan',
        title: 'Login tetap tersimpan',
        points: ['Pilihan "Ingat aku" dihapus: login selalu tersimpan 24 jam, dan masuk/keluar ikut di semua tab.'],
      },
    ],
  },
];
