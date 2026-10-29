// Tipe-tipe ini mirror JSON yang dibalikin backend-go (internal/models/*.go).
// Kalau field di Go berubah, samain juga di sini.

/**
 * Pending ─CCO─► Dikonfirmasi ─Farmasi─► Siap diambil ─CCO (ambil + kemas)─► Siap kirim
 * ─Kurir (scan label)─► Dalam pengiriman ─Kurir─► Selesai.
 * Ops assigns the courier between Dikonfirmasi and Siap kirim (not a status).
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'ready_for_pickup'
  | 'packed'
  | 'on_delivery'
  | 'done'
  | 'cancelled';

/** Status history can still hold steps the flow no longer uses. */
export type HistoryStatus = OrderStatus | 'assigned' | 'collected';

/** Every status in flow order (for filters, cards, charts). */
export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'ready_for_pickup',
  'packed',
  'on_delivery',
  'done',
  'cancelled',
];

export type OrderSource = 'public' | 'cco' | 'farmasi';

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  public: 'Form publik',
  cco: 'Input CCO',
  farmasi: 'Input Farmasi',
};

export type ScheduleSlot = 'pagi' | 'siang' | 'sore';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

/** cash = tunai di kasir RS sebelum obat diambil; noncash = transfer/QRIS, dicek CCO lalu ditandai lunas. */
export type PaymentMethod = 'cash' | 'noncash';
export type UserRole = 'admin' | 'ops' | 'cco' | 'kurir' | 'finance' | 'farmasi';

export const ORDER_STATUS_LABELS: Record<HistoryStatus, string> = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Dikonfirmasi',
  ready_for_pickup: 'Siap diambil',
  packed: 'Siap kirim',
  on_delivery: 'Dalam pengiriman',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
  assigned: 'Kurir ditugaskan', // old flow
  collected: 'Diambil dari RS', // old flow, now part of Siap kirim
};

// Transisi status yang sah — cermin dari enums.OrderStatus di Go /
// app/Enums/OrderStatus.php di Laravel. Dipakai buat isi dropdown "Ubah status".
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['packed', 'cancelled'],
  packed: ['on_delivery', 'cancelled'],
  on_delivery: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

export interface Role {
  id: number;
  name: UserRole;
  label?: string | null;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  address?: string | null;
  /** Exact map point of the RS (pickup); null = not set yet. */
  lat?: number | null;
  lng?: number | null;
  /** Service area: the farthest an order may go from the RS (km, by road); null = no limit. */
  max_distance_km?: number | null;
  phone?: string | null;
  is_active: boolean;
}

export interface ServiceTier {
  id?: number;
  up_to_km: number;
  price: number;
}

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  /** Flat price, and the price when the distance is unknown. */
  price_base: number;
  /** Distance tiers (empty = flat price) and the per-km charge beyond the last. */
  tiers?: ServiceTier[] | null;
  price_per_km?: number | null;
  is_active: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role_id?: number | null;
  role?: Role | null;
  organization_id?: number | null;
  organization?: Organization | null;
  is_active: boolean;
}

export interface Courier {
  id: number;
  user_id: number;
  user?: User | null;
  organization_id?: number | null;
  organization?: Organization | null;
  vehicle_type?: string | null;
  phone?: string | null;
  is_active: boolean;
  last_lat?: number | null;
  last_lng?: number | null;
}

export interface OrderStatusHistoryEntry {
  id: number;
  order_id: number;
  from_status?: HistoryStatus | null;
  to_status: HistoryStatus;
  changed_by?: number | null;
  changed_by_user?: User | null;
  note?: string | null;
  changed_at: string;
}

export type PatientCategory = 'umum' | 'lansia' | 'disabilitas';

export const PATIENT_CATEGORY_LABELS: Record<PatientCategory, string> = {
  umum: 'Umum',
  lansia: 'Lansia',
  disabilitas: 'Disabilitas',
};

/** Program ongkir gratis settings (Admin → Pengaturan). */
export interface FreeProgram {
  enabled: boolean;
  /** Domicile requirement, e.g. "Kota Magelang". */
  domicile: string;
}

/** Where the prescription comes from: rawat jalan (+ pharmacy queue no.) or rawat inap (+ ward). */
export type CareType = 'rawat_jalan' | 'rawat_inap';

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  rawat_jalan: 'Rawat jalan',
  rawat_inap: 'Rawat inap',
};

/** Bangsal rawat inap (master data, Admin → Pengaturan → Bangsal). */
export interface Ward {
  id: number;
  name: string;
  is_active: boolean;
}

/**
 * Wilayah (kode Kemendagri): level 1 provinsi "33", 2 kab/kota "33.71",
 * 3 kecamatan "33.71.01", 4 kelurahan/desa "33.71.01.1001".
 */
export interface Region {
  code: string;
  name: string;
  level: number;
}

export interface Order {
  id: number;
  code: string;
  organization_id?: number | null;
  organization?: Organization | null;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  dropoff_address: string;
  /** Kelurahan/desa tujuan and its label, e.g. "Kel. Tidar Utara, Kec. Magelang Selatan, Kota Magelang". */
  dropoff_region_code?: string | null;
  dropoff_region?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  service_id?: number | null;
  service?: Service | null;
  courier_id?: number | null;
  courier?: Courier | null;
  status: OrderStatus;
  source: OrderSource;
  /** Delivery schedule; null date = secepatnya. */
  scheduled_date?: string | null;
  scheduled_slot?: ScheduleSlot | null;
  /** Optional patient data (internal only). */
  patient_name?: string | null;
  medical_record_no?: string | null;
  /** Program ongkir gratis: category + domicile checked by staff; free → price 0, tariff in normal_price. */
  patient_category?: PatientCategory;
  domicile_checked?: boolean;
  is_free?: boolean;
  normal_price?: number | null;
  /** Farmasi: rawat jalan + queue no., or rawat inap + ward. Null on public/kiosk orders until staff fill it. */
  care_type?: CareType | null;
  pharmacy_queue_no?: string | null;
  ward_id?: number | null;
  ward?: Ward | null;
  created_by?: number | null;
  creator?: User | null;
  price: number;
  /** Road distance RS → destination (km); source "road" or "estimate" (routing server unreachable). */
  distance_km?: number | null;
  distance_source?: 'road' | 'estimate' | null;
  notes?: string | null;
  confirmed_at?: string | null;
  ready_at?: string | null;
  collected_at?: string | null;
  packed_at?: string | null;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  status_history?: OrderStatusHistoryEntry[];
  transaction?: Transaction | null;
  /** Proof of delivery, once the courier finished the order. */
  delivery?: OrderDelivery | null;
}

export interface Transaction {
  id: number;
  order_id: number;
  order?: Order | null;
  organization_id?: number | null;
  organization?: Organization | null;
  amount: number;
  /** null for orders from before payment methods. */
  payment_method?: PaymentMethod | null;
  payment_status: PaymentStatus;
  /** Receipt of a non-cash payment. */
  proof_url?: string | null;
  proof_uploaded_at?: string | null;
  /** e.g. why a receipt was rejected. */
  note?: string | null;
  recorded_by?: number | null;
  recorded_by_user?: User | null;
  paid_at?: string | null;
  created_at: string;
}

/** Pagination info returned alongside paginated list endpoints. */
export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export type StatsRange = 7 | 30 | 90;

export interface OrderStats {
  /** All-time totals (dashboard tiles). */
  total: number;
  by_status: Partial<Record<OrderStatus, number>>;
  /** Admin & Finance only: the API leaves it out for the other roles. */
  revenue?: number;
  /** Orders delivered since midnight. */
  done_today?: number;
  /** Chart data for the last `days` days. */
  days: StatsRange;
  trend: {
    daily: { date: string; orders: number; revenue?: number }[];
    by_status: Partial<Record<OrderStatus, number>>;
  };
}

/** Public (no-login) views — only what the public pages show. */
export interface PublicOrganization {
  name: string;
  address?: string | null;
  /** Map point of the RS (for the distance shown on the form). */
  lat?: number | null;
  lng?: number | null;
}

export interface TrackedOrder {
  code: string;
  status: OrderStatus;
  organization: { name: string } | null;
  service_name: string | null;
  price: number;
  /** Program ongkir gratis: the patient pays nothing. */
  is_free?: boolean;
  customer_name: string;
  /** Masked by the API, e.g. 081*******90. */
  customer_phone: string;
  dropoff_address: string;
  courier_name: string | null;
  scheduled_date: string | null;
  scheduled_slot: ScheduleSlot | null;
  /** Payment chosen when ordering (null for older orders). */
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
  } | null;
  created_at: string;
  status_history: { from_status?: HistoryStatus | null; to_status: HistoryStatus; note?: string | null; changed_at: string }[];
  /** Proof of delivery without the GPS point. */
  delivery: Pick<OrderDelivery, 'receiver_name' | 'receiver_relation' | 'photo_urls' | 'thumb_urls' | 'delivered_at'> | null;
}

/** Live event for staff who must act on an order (see the API's realtime.NotifyRoles). */
export interface OrderEvent {
  type: 'order.created' | 'order.status';
  order_id: number;
  code: string;
  status: OrderStatus;
  organization_id: number | null;
  organization_name: string;
  customer_name: string;
  source: OrderSource;
  /** Who caused it; null for the public form. */
  actor_id: number | null;
  created_at: string;
}

/** Saved recipient of an RS, reused in internal orders. */
export interface Customer {
  id: number;
  organization_id: number;
  organization?: Organization | null;
  name: string;
  phone: string;
  address: string;
  /** Kelurahan/desa of the address, if known. */
  region_code?: string | null;
  /** Map point of the address, if known. */
  lat?: number | null;
  lng?: number | null;
  notes: string | null;
  order_count: number;
  last_order_at: string | null;
  created_at: string;
}

export type ReceiverRelation = 'pasien' | 'keluarga' | 'tetangga' | 'satpam' | 'lainnya';

export const RECEIVER_RELATION_LABELS: Record<ReceiverRelation, string> = {
  pasien: 'Pasien',
  keluarga: 'Keluarga',
  tetangga: 'Tetangga',
  satpam: 'Satpam / resepsionis',
  lainnya: 'Lainnya',
};

/** Proof of delivery (POD) submitted by the courier when finishing an order. */
export interface OrderDelivery {
  id: number;
  order_id: number;
  receiver_name: string;
  receiver_relation: ReceiverRelation;
  note: string | null;
  /** Paths on the API ("/uploads/…") or full URLs — resolve with fileUrl(). */
  photo_urls: string[];
  /** Square ~400px thumbnails, same order as photo_urls. */
  thumb_urls?: string[];
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  delivered_by_user?: User | null;
  delivered_at: string;
}
