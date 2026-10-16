# MedSend Admin (shadcn/ui)

Frontend buat [`backend-go`](../backend-go/) — **shadcn/ui** (komponen React
asli di atas Radix UI primitives), mulai dari block resmi **`dashboard-01`**
(sidebar + stat card + data table). Ini satu-satunya frontend proyek ini —
ada versi awal pakai Preline UI (`frontend/`) tapi udah dihapus setelah
dibandingin, shadcn yang dilanjutkan.

## Setup

```bash
cp .env.example .env      # isi VITE_API_URL kalau API-nya beda port/host
npm install
npm run dev                # http://localhost:5173 (atau port lain kalau bentrok)
```

Butuh `backend-go` jalan (`go run .` di :8080) dan sudah di-migrate + seed.
Login: `admin@medsend.test` / `password` (semua akun seed sama, role beda —
lihat `backend-go/cmd/seed/main.go` buat daftar akunnya).

## Kenapa shadcn (arsitektur, bukan library yang di-install)

CLI-nya (`npx shadcn@latest add ...`) nge-generate source komponen React
(berbasis Radix UI primitives) langsung ke `src/components/ui/` — kodenya
beneran punya kita, bukan dependency. Setup yang dipakai:

```bash
npx shadcn@latest init --template vite -b radix -p nova -y
npx shadcn@latest add dashboard-01 -y        # block resmi: sidebar+chart+data-table
npx shadcn@latest add alert textarea dialog switch -y
```

**Catatan CLI:** `-y` doang nggak cukup buat non-interaktif — perlu `-b`
(component library) dan `-p` (preset) eksplisit, kalau nggak CLI-nya nge-hang
nunggu prompt. Komponen bernama `form` nggak ke-generate di versi CLI ini
(silent, tanpa error) — form (Login, resource dialog, dst) ditulis manual
pakai `Input`/`Label`/`Select`/`Button`/`Switch` + `react-hook-form` langsung,
bukan lewat wrapper `<Form>` shadcn.

`dashboard-01` narik 32 file sekaligus. Yang **dipertahankan**: semua
`components/ui/*` (primitive asli, jangan diedit manual — re-add lewat CLI
kalau perlu versi baru). Yang **ditulis ulang** pakai data MedSend beneran
(demo "Acme Inc" / chart bohongan dibuang): `app-sidebar.tsx` (nav
role-based), `nav-user.tsx` (auth user asli + logout), `section-cards.tsx`
(stat order asli), `site-header.tsx` (judul per halaman). `data-table.tsx`
dan `chart-area-interactive.tsx` demo dihapus total — nggak ada sumber data
time-series buat bikin grafik yang jujur, jadi belum ada chart sama sekali
(lebih baik kosong daripada nampilin angka palsu).

Warna brand navy `#18186C` di-override di `src/index.css` lewat token CSS
var shadcn sendiri (`--primary`, `--sidebar-primary`, `--ring`, dst di
`:root`/`.dark`) — generate otomatis pas init, tinggal ganti nilainya.

## Struktur

```
src/
  components/
    ui/                shadcn primitives (jangan diedit manual, re-add lewat CLI)
    app-sidebar.tsx     nav MedSend, role-based
    nav-user.tsx        dropdown user + logout (Radix DropdownMenu)
    section-cards.tsx   4 stat card dashboard, data order asli
    site-header.tsx     topbar: SidebarTrigger + judul halaman
    layout/AdminLayout.tsx   SidebarProvider + AppSidebar + SiteHeader + <Outlet/>
    StatusBadge.tsx     badge warna per OrderStatus
    ProtectedRoute.tsx
  features/
    orders/queries.ts, organizations/, services/, couriers/, users/,
    transactions/, roles/          — satu file queries.ts per resource
    (TanStack Query: list + create/update mutation)
  lib/{api,auth,roles,format}.ts
  types/models.ts
  pages/
    LoginPage.tsx, DashboardPage.tsx
    orders/OrdersListPage.tsx, orders/OrderDetailPage.tsx
    organizations/OrganizationsPage.tsx
    services/ServicesPage.tsx
    couriers/CouriersPage.tsx
    users/UsersPage.tsx
    transactions/TransactionsPage.tsx
```

Pola tiap resource (selain Order, yang punya halaman detail sendiri):
**satu halaman** = tabel (TanStack Table v8) + tombol "Tambah" + `Dialog`
shadcn berisi form create/edit (react-hook-form + zod), row action "Edit"
buka dialog yang sama dengan data ter-isi. Nggak ada route terpisah per
create/edit — semua lewat dialog di halaman list.

## Yang udah jalan (dites Playwright headless tiap resource — 0 console error)

- Auth JWT (login/logout), role-gating sidebar (Admin lihat semua menu;
  role lain cuma yang relevan — CCO/Ops/Finance lihat Order, Ops+Admin lihat
  Kurir, cuma Admin lihat Master Data, Admin+Finance lihat Laporan Transaksi)
- Dashboard: stat card data asli, klik → Order ter-filter
- **Order**: list+filter, detail, ubah status (transisi sah aja), assign
  kurir, riwayat status
- **RS/Instansi, Tipe Layanan, User**: list + tambah + edit lewat dialog
  (Admin only)
- **Kurir**: list (Admin+Ops, ter-scope dedicated+freelance sesuai aturan RS)
  + tambah/edit (Admin only) — dropdown user cuma nampilin yang role-nya Kurir
- **Laporan Transaksi**: list (ter-scope tenant) + total nominal + update
  status pembayaran lewat dialog (Admin+Finance)

## Belum dikerjakan

Chart/grafik (lihat alasan di atas), delete record (backend-nya juga belum
ada endpoint delete — lihat `backend-go/README.md`), refresh token,
API + halaman khusus app kurir.
