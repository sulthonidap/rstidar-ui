import { createContext, useContext } from 'react';

import type { SetupChecklistData } from '@/features/setup/queries';
import type { UserRole } from '@/types/models';

export interface ChecklistItem {
  key: string;
  label: string;
  /** What this step is for, in one line. */
  hint: string;
  /** Where the admin completes it ("?tambah=…" opens the create form there). */
  to: string;
  done: boolean;
  /** e.g. "2 akun" once done. */
  status: string;
  required: boolean;
}

const ROLE_STEPS: { role: UserRole; label: string; hint: string }[] = [
  { role: 'farmasi', label: 'Akun Farmasi', hint: 'Menyiapkan obat, menandai order siap diambil' },
  { role: 'cco', label: 'Akun CCO', hint: 'Mengonfirmasi, mengambil & mengemas order' },
  { role: 'ops', label: 'Akun Ops', hint: 'Menugaskan kurir ke order' },
  { role: 'kurir', label: 'Akun Kurir', hint: 'Mengantar paket lewat aplikasi kurir' },
  { role: 'finance', label: 'Akun Finance', hint: 'Mencatat pembayaran & laporan transaksi' },
];

/** First-run steps in the order the work flows: services, then each staff role, then (optional) payment. */
export function buildChecklist(data: SetupChecklistData): ChecklistItem[] {
  return [
    {
      key: 'services',
      label: 'Tipe Layanan',
      hint: 'Jenis pengantaran dan tarifnya',
      to: data.services > 0 ? '/services' : '/services?tambah=1',
      done: data.services > 0,
      status: data.services > 0 ? `${data.services} layanan` : 'belum ada',
      required: true,
    },
    ...ROLE_STEPS.map(({ role, label, hint }) => {
      const n = data.users[role] ?? 0;
      return {
        key: role,
        label,
        hint,
        to: n > 0 ? '/users' : `/users?tambah=${role}`,
        done: n > 0,
        status: n > 0 ? `${n} akun aktif` : 'belum ada',
        required: true,
      };
    }),
    {
      key: 'payment',
      label: 'Pembayaran non-tunai',
      hint: 'Rekening bank / QRIS untuk transfer',
      to: '/pengaturan/pembayaran',
      done: data.payment_configured,
      status: data.payment_configured ? 'sudah diatur' : 'opsional',
      required: false,
    },
  ];
}

export interface SetupChecklistValue {
  /** Admin with checklist data loaded. */
  enabled: boolean;
  items: ChecklistItem[];
  requiredDone: number;
  requiredTotal: number;
  complete: boolean;
  openChecklist: () => void;
}

export const SetupChecklistContext = createContext<SetupChecklistValue | undefined>(undefined);

export function useSetupChecklistUI() {
  const ctx = useContext(SetupChecklistContext);
  if (!ctx) throw new Error('useSetupChecklistUI must be used inside <SetupChecklistProvider>');
  return ctx;
}
