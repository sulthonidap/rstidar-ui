/**
 * The RS's feature requests and what was built — shown on /changelog, in the
 * order they were requested. Videos and their poster images live in
 * public/changelog-media/.
 */
export interface ChangelogEntry {
  no: number;
  title: string;
  /** ISO date it was finished, e.g. "2026-10-30". */
  date: string;
  summary: string;
  points: string[];
  /** File name in public/changelog-media/ without extension: <name>.mp4 + <name>.jpg (poster). */
  video?: string;
  /** Second to start the video at (a video shared by two entries). */
  videoStart?: number;
  /** Poster file name when it isn't the video's own (<video>.jpg). */
  poster?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    no: 1,
    title: 'Wilayah layanan',
    date: '2026-10-29',
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
    no: 2,
    title: 'Ongkir gratis untuk pasien lansia & disabilitas',
    date: '2026-10-30',
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
    no: 3,
    title: 'Privasi data pasien',
    date: '2026-10-28',
    summary: 'Data pasien disamarkan di semua tampilan panel dan di label paket.',
    points: [
      'Nama, nomor HP, no. rekam medis, dan alamat disamarkan di daftar order, detail order, dan label paket.',
      'Data lengkap hanya untuk kurir saat mengantar dan di potongan bawah label (garis gunting) untuk arsip RS.',
    ],
    video: '4-privasi-dan-lacak',
  },
  {
    no: 4,
    title: 'Lacak order untuk pasien',
    date: '2026-10-28',
    summary: 'Pasien bisa memantau ordernya sendiri tanpa login.',
    points: [
      'Halaman /lacak: cukup masukkan kode order yang diterima saat membuat order.',
      'Sebelum kurir berangkat tampil "Dalam pengemasan"; detail perjalanan muncul setelah kurir memindai paket.',
    ],
    video: '4-privasi-dan-lacak',
    videoStart: 23.5,
    poster: '4-lacak',
  },
  {
    no: 5,
    title: 'Farmasi: asal resep di setiap order',
    date: '2026-10-29',
    summary: 'Petugas farmasi langsung tahu resep dari mana.',
    points: [
      'Rawat jalan: isi no. antrian farmasi. Rawat inap: pilih bangsal.',
      'Master data bangsal bisa dikelola Admin (Pengaturan → Bangsal).',
      'Kolom Farmasi tampil di daftar order, detail order, dan label paket.',
      'Di form pasien & kiosk bisa dinyalakan/dimatikan Admin; di form petugas selalu wajib.',
    ],
    video: '3-farmasi',
  },
];
