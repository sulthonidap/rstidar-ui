import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleCheckBigIcon,
  HistoryIcon,
  LoaderCircleIcon,
  SearchIcon,
  UserPlusIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import Loader from '@/components/Loader';
import LocationPicker from '@/components/LocationPicker';
import OutOfRangeDialog from '@/components/OutOfRangeDialog';
import PaymentChoice from '@/components/PaymentChoice';
import PaymentPanel from '@/components/PaymentPanel';
import QuoteLine, { distanceText } from '@/components/QuoteLine';
import RegionFields from '@/components/RegionFields';
import PharmacyFields, { NO_PHARMACY, pharmacyError, pharmacyPayload, type PharmacyValue } from '@/components/PharmacyFields';
import ServiceChoice from '@/components/ServiceChoice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ReturningPatient } from '@/features/public/queries';
import {
  useCreatePublicOrder,
  usePublicOrganization,
  usePublicServices,
  useQuote,
  useReturningPatient,
  useTrackOrder,
} from '@/features/public/queries';
import { usePublicPharmacy } from '@/features/wards/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import type { LatLng } from '@/lib/geocode';
import { cn } from '@/lib/utils';
import KioskKeyboard from '@/pages/kiosk/KioskKeyboard';
import KioskCountdown from '@/pages/public/KioskCountdown';
import type { PaymentMethod } from '@/types/models';

type Step = 'welcome' | 'lookup' | 'patient' | 'location' | 'service' | 'payment' | 'done';

/** The numbered steps of an order (welcome / lookup / done aren't counted). */
const FLOW: { step: Step; label: string }[] = [
  { step: 'patient', label: 'Data pasien' },
  { step: 'location', label: 'Lokasi' },
  { step: 'service', label: 'Layanan' },
  { step: 'payment', label: 'Pembayaran' },
];

interface Draft {
  medical_record_no: string;
  patient_name: string;
  customer_name: string;
  customer_phone: string;
  dropoff_address: string;
  notes: string;
}

const EMPTY: Draft = {
  medical_record_no: '',
  patient_name: '',
  customer_name: '',
  customer_phone: '',
  dropoff_address: '',
  notes: '',
};

const PHONE = /^[0-9+\-\s()]{6,}$/;

// md:text-lg too: the Input/Textarea base class shrinks text to sm from md up.
const fieldClass = 'h-14 rounded-xl text-lg md:text-lg';

// Indonesian zone names by UTC offset. The browser's own short name depends on the
// device's zone setting (Windows "Bangkok, Hanoi, Jakarta" gives "GMT+7", not "WIB").
const ID_ZONES: Record<number, string> = { 7: 'WIB', 8: 'WITA', 9: 'WIT' };

function zoneLabel(d: Date): string {
  const hours = -d.getTimezoneOffset() / 60;
  return ID_ZONES[hours] ?? `GMT${hours >= 0 ? '+' : ''}${hours}`;
}

/** "Selasa, 06 Oktober 2026" + "10:31 WIB", ticking. */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="shrink-0 text-right">
      <p className="hidden text-sm font-medium text-slate-500 sm:block">
        {now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
      </p>
      <p className="text-xl font-extrabold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
        {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} {zoneLabel(now)}
      </p>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 text-center sm:mb-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 text-base font-medium text-slate-500 sm:mt-3 sm:text-lg lg:text-xl">{subtitle}</p>}
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-3xl bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-6 lg:p-8', className)}>{children}</div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold tracking-wide text-slate-600 uppercase">{label}</Label>
      {children}
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

/** Big round side button (back / next), like a kiosk's page arrows. */
function SideArrow({
  side,
  disabled,
  onClick,
  label,
}: {
  side: 'left' | 'right';
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'fixed top-1/2 z-20 hidden size-40 -translate-y-1/2 place-items-center rounded-full text-white shadow-2xl transition active:scale-95 disabled:opacity-40 lg:grid',
        side === 'left' ? '-left-20 bg-brand-orange' : '-right-20 bg-primary',
        disabled && side === 'right' && 'bg-slate-400',
      )}
    >
      <span
        className={cn(
          'grid size-14 place-items-center rounded-full border-2 border-white/80',
          side === 'left' ? 'translate-x-9' : '-translate-x-9',
        )}
      >
        {side === 'left' ? <ArrowLeftIcon className="size-7" /> : <ArrowRightIcon className="size-7" />}
      </span>
    </button>
  );
}

/**
 * /kios — the order form as a full-screen kiosk for a shared touch screen at
 * the RS counter: one step per screen, big touch targets, an on-screen
 * keyboard, and back to the welcome screen a minute after an order is made.
 * Same API and rules as the public form (/order).
 */
export default function KioskPage() {
  const { data: org, isLoading: orgLoading, isError: orgError } = usePublicOrganization();
  const { data: services } = usePublicServices();
  const create = useCreatePublicOrder();
  const lookup = useReturningPatient();

  const [step, setStep] = useState<Step>('welcome');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | ''>('');
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  // Farmasi: only while the Admin turned it on (then required).
  const { data: pharmacySetup } = usePublicPharmacy();
  const [pharmacy, setPharmacy] = useState<PharmacyValue>(NO_PHARMACY);
  const askPharmacy = !!pharmacySetup?.enabled;
  // Kelurahan/desa tujuan: required, inside the service area.
  const [region, setRegion] = useState('');
  const placed = useTrackOrder(code);

  const quote = useQuote(org ? { dropoff_lat: point?.[0], dropoff_lng: point?.[1] } : null);
  const selected = quote.data?.services?.find((q) => String(q.service_id) === serviceId);
  const selectedQuote = quote.data && selected ? { ...quote.data, ...selected } : undefined;

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const reset = () => {
    setStep('welcome');
    setDraft(EMPTY);
    setPoint(null);
    setServiceId('');
    setPayment('');
    setQuery('');
    setCode('');
    setPharmacy(NO_PHARMACY);
    setRegion('');
    create.reset();
    lookup.reset();
  };

  const prefill = (p: ReturningPatient) => {
    setDraft({
      medical_record_no: p.medical_record_no ?? '',
      patient_name: p.patient_name ?? '',
      customer_name: p.customer_name,
      customer_phone: p.customer_phone,
      dropoff_address: p.dropoff_address,
      notes: '',
    });
    if (p.dropoff_lat != null && p.dropoff_lng != null) setPoint([p.dropoff_lat, p.dropoff_lng]);
    setRegion(p.dropoff_region_code ?? '');
    setStep('patient');
  };

  const search = async () => {
    if (!query.trim()) return;
    try {
      prefill(await lookup.mutateAsync({ query: query.trim() }));
    } catch {
      // Shown on the lookup screen.
    }
  };

  const submit = async () => {
    if (!payment || !serviceId) return;
    try {
      const res = await create.mutateAsync({
        service_id: Number(serviceId),
        customer_name: draft.customer_name.trim(),
        customer_phone: draft.customer_phone.trim(),
        dropoff_address: draft.dropoff_address.trim(),
        notes: draft.notes.trim() || undefined,
        patient_name: draft.patient_name.trim() || undefined,
        medical_record_no: draft.medical_record_no.trim() || undefined,
        dropoff_lat: point?.[0],
        dropoff_lng: point?.[1],
        payment_method: payment,
        ...(askPharmacy ? pharmacyPayload(pharmacy) : {}),
        dropoff_region_code: region,
        website: '',
      });
      setCode(res.code);
      setStep('done');
    } catch {
      // Shown on the payment screen.
    }
  };

  // What each numbered step needs before "next".
  const valid: Partial<Record<Step, boolean>> = {
    // The RS finds the prescription by the patient's name + medical record number: both required.
    patient:
      draft.medical_record_no.trim() !== '' &&
      draft.patient_name.trim() !== '' &&
      draft.customer_name.trim() !== '' &&
      PHONE.test(draft.customer_phone.trim()) &&
      (!askPharmacy || !pharmacyError(pharmacy)),
    location: !!region && draft.dropoff_address.trim() !== '' && !quote.data?.out_of_range,
    service: !!selected,
    payment: !!payment,
  };
  const flowIndex = FLOW.findIndex((f) => f.step === step);

  const back = () => {
    if (flowIndex > 0) setStep(FLOW[flowIndex - 1].step);
    else reset();
  };
  const next = () => {
    if (step === 'payment') return void submit();
    if (flowIndex >= 0 && flowIndex < FLOW.length - 1 && valid[step]) setStep(FLOW[flowIndex + 1].step);
  };

  let body: ReactNode;
  if (orgLoading) {
    body = <Loader label="Memuat…" />;
  } else if (orgError || !org) {
    body = <Heading title="Layanan belum tersedia" subtitle="Silakan hubungi petugas rumah sakit." />;
  } else if (step === 'welcome') {
    body = (
      <>
        <Heading title="Selamat Datang di Anjungan Kirim Obat" subtitle="Apakah Anda sudah pernah menggunakan layanan ini?" />
        <div className="mx-auto grid max-w-5xl gap-4 sm:gap-8 md:grid-cols-2">
          {[
            {
              icon: UserPlusIcon,
              title: 'BELUM',
              text: 'Untuk pasien yang baru pertama kali memakai layanan pengantaran obat.',
              action: 'MULAI PESAN',
              primary: true,
              go: () => setStep('patient'),
            },
            {
              icon: HistoryIcon,
              title: 'PERNAH',
              text: 'Sudah pernah memakai layanan ini — data Anda bisa diisi otomatis.',
              action: 'CARI DATA SAYA',
              primary: false,
              go: () => setStep('lookup'),
            },
          ].map((c) => (
            <Panel key={c.title} className="flex flex-col items-center text-center">
              <span className="grid size-20 place-items-center rounded-full bg-sky-50 text-brand-blue sm:size-28">
                <c.icon className="size-9 sm:size-12" />
              </span>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-900 sm:mt-6 sm:text-3xl">{c.title}</h2>
              <p className="mt-2 flex-1 text-base text-slate-500 sm:mt-3 sm:text-lg">{c.text}</p>
              <Button
                size="lg"
                variant={c.primary ? 'default' : 'outline'}
                className="mt-6 h-14 w-full rounded-xl text-lg font-bold tracking-wide sm:mt-8 sm:h-16"
                onClick={c.go}
              >
                {c.action}
                <ArrowRightIcon />
              </Button>
            </Panel>
          ))}
        </div>
      </>
    );
  } else if (step === 'lookup') {
    body = (
      <>
        <Heading title="Cari Data Anda" subtitle="Ketik nomor HP atau No. Rekam Medis yang dipakai waktu pesan sebelumnya." />
        <Panel className="mx-auto max-w-3xl space-y-6">
          <Field label="No. HP atau No. Rekam Medis">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                autoFocus
                className={cn(fieldClass, 'flex-1')}
                placeholder="mis. 0812xxxx atau nomor di kartu berobat"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void search()}
              />
              <Button className="h-14 rounded-xl px-6 text-lg" onClick={search} disabled={!query.trim() || lookup.isPending}>
                {lookup.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SearchIcon />}
                Cari
              </Button>
            </div>
          </Field>
          {lookup.isError && (
            <Alert variant="destructive">
              <AlertDescription className="text-base">
                {apiErrorMessage(lookup.error, 'Gagal mencari data.')}{' '}
                <button type="button" className="font-bold underline" onClick={() => setStep('patient')}>
                  Isi data manual
                </button>
              </AlertDescription>
            </Alert>
          )}
          <KioskKeyboard />
        </Panel>
      </>
    );
  } else if (step === 'patient') {
    body = (
      <>
        <Heading title="Data Pasien & Penerima" subtitle="Siapa pasiennya, dan siapa yang menerima obat di rumah?" />
        <Panel className="mx-auto max-w-4xl space-y-6">
          {lookup.isSuccess && (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
              <CheckCircle2Icon className="size-5 shrink-0" />
              Data ditemukan dan sudah diisi. Periksa lagi, ubah kalau ada yang berbeda.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="No. Rekam Medis">
              <Input className={fieldClass} placeholder="Lihat di kartu berobat" value={draft.medical_record_no} onChange={set('medical_record_no')} />
            </Field>
            <Field label="Nama pasien">
              <Input className={fieldClass} placeholder="Sesuai kartu berobat" value={draft.patient_name} onChange={set('patient_name')} />
            </Field>
            <Field label="Nama penerima">
              <Input className={fieldClass} placeholder="Nama orang yang menerima obat" value={draft.customer_name} onChange={set('customer_name')} />
              {/* Often the patient receives it: one tap instead of typing the name twice on the kiosk keyboard. */}
              {draft.patient_name.trim() !== '' && draft.customer_name.trim() !== draft.patient_name.trim() && (
                <button
                  type="button"
                  className="text-base font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => setDraft((d) => ({ ...d, customer_name: d.patient_name.trim() }))}
                >
                  Penerima = pasien ({draft.patient_name.trim()})
                </button>
              )}
            </Field>
            <Field label="No. HP / WhatsApp penerima">
              <Input
                className={fieldClass}
                type="tel"
                inputMode="tel"
                placeholder="08xx"
                value={draft.customer_phone}
                onChange={set('customer_phone')}
              />
            </Field>
          </div>
          {askPharmacy && (
            <div className="text-lg">
              <PharmacyFields value={pharmacy} onChange={setPharmacy} wards={pharmacySetup?.wards} />
            </div>
          )}
          <KioskKeyboard />
        </Panel>
      </>
    );
  } else if (step === 'location') {
    const distance = distanceText(quote.data?.distance_km, quote.data?.distance_source);
    body = (
      <>
        <Heading title="Detail Lokasi Pengiriman" subtitle="Lengkapi alamat dan tandai titik rumah di peta." />
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <RegionFields value={region} onChange={setRegion} />
            <Field label="Alamat lengkap">
              <Textarea
                rows={3}
                className="rounded-xl text-lg md:text-lg"
                placeholder="Nama jalan, nomor, RT/RW"
                value={draft.dropoff_address}
                onChange={set('dropoff_address')}
              />
            </Field>
            <Field label="Patokan alamat (opsional)">
              <Textarea
                rows={2}
                className="rounded-xl text-lg md:text-lg"
                placeholder="mis. rumah cat biru, pagar hitam, sebelah masjid"
                value={draft.notes}
                onChange={set('notes')}
              />
            </Field>
            <KioskKeyboard />
          </div>
          <div className="border-t bg-slate-50 p-4 lg:border-t-0 lg:border-l">
            <LocationPicker
              value={point}
              onChange={setPoint}
              pinLabel="Tujuan"
              pinColor="#F07A22"
              reference={org.lat != null && org.lng != null ? { point: [org.lat, org.lng], label: org.name } : null}
              route={quote.data?.route}
              distanceLabel={distance ? `${distance} dari ${org.name}` : null}
              placeholder="Ketik nama jalan, desa, atau tempat terdekat"
              mapClassName="h-[20rem] sm:h-[24rem] lg:h-[30rem]"
              size="lg"
            />
          </div>
        </div>
        <OutOfRangeDialog quote={quote.data} rsName={org.name} />
      </>
    );
  } else if (step === 'service') {
    body = (
      <>
        <Heading
          title="Pilih Jenis Pengiriman"
          subtitle={point ? 'Harga menyesuaikan jarak dari rumah sakit ke alamat Anda.' : 'Titik peta belum ditandai, harga memakai tarif dasar.'}
        />
        <Panel className="mx-auto max-w-4xl space-y-5">
          <ServiceChoice size="lg" services={services} quote={quote.data} value={serviceId} onChange={setServiceId} />
          <QuoteLine quote={selectedQuote} loading={quote.isFetching} />
        </Panel>
      </>
    );
  } else if (step === 'payment') {
    const rows: [string, string][] = [
      ['Pasien', [draft.patient_name, draft.medical_record_no && `RM ${draft.medical_record_no}`].filter(Boolean).join(' · ') || '—'],
      ['Penerima', `${draft.customer_name} · ${draft.customer_phone}`],
      ['Alamat', draft.dropoff_address + (draft.notes ? ` (${draft.notes})` : '')],
      ['Layanan', selected ? `${services?.find((s) => String(s.id) === serviceId)?.name ?? ''} · ${formatRupiah(selected.price)}` : '—'],
    ];
    body = (
      <>
        <Heading title="Periksa & Pilih Pembayaran" subtitle="Pastikan data sudah benar, lalu pilih cara membayar." />
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <Panel>
            <dl className="divide-y">
              {rows.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3 text-base sm:grid-cols-[7rem_1fr] sm:gap-4 sm:text-lg">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel className="space-y-5">
            <PaymentChoice size="lg" value={payment} onChange={setPayment} />
            {create.isError && (
              <Alert variant="destructive">
                <AlertDescription>{apiErrorMessage(create.error, 'Pesanan gagal dibuat. Coba lagi.')}</AlertDescription>
              </Alert>
            )}
            <Button className="h-16 w-full rounded-xl text-lg font-bold" disabled={!payment || create.isPending} onClick={submit}>
              {create.isPending ? <LoaderCircleIcon className="animate-spin" /> : <CheckCircle2Icon />}
              BUAT PESANAN
            </Button>
          </Panel>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <CircleCheckBigIcon className="mx-auto size-16 text-emerald-500 sm:size-24" />
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">Pesanan Berhasil Dibuat</h1>
          <p className="text-lg text-slate-500 sm:text-xl">Simpan kode ini untuk melacak pesanan Anda.</p>
          <p className="inline-block max-w-full rounded-2xl border-2 border-dashed border-primary/40 bg-white px-4 py-3 font-mono text-2xl font-bold tracking-wider break-all text-primary sm:px-8 sm:py-4 sm:text-4xl sm:tracking-widest">
            {code}
          </p>
          {placed.data && (
            <Panel className="text-left">
              <PaymentPanel order={placed.data} bare />
            </Panel>
          )}
          <KioskCountdown onDone={reset} />
        </div>
      </>
    );
  }

  const inFlow = flowIndex >= 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-linear-to-b from-white to-sky-50">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <button type="button" onClick={reset} className="flex min-w-0 items-center gap-3 sm:gap-4" aria-label="Kembali ke awal">
          <img src="/logo.png" alt="" className="size-10 shrink-0 object-contain sm:size-14" />
          <span className="truncate text-lg font-extrabold text-primary sm:text-2xl">{org?.name ?? 'MedSend'}</span>
        </button>
        <Clock />
      </header>

      {inFlow && (
        <ol className="mx-auto mb-6 flex max-w-3xl items-center justify-center gap-2 px-4 sm:px-8">
          {FLOW.map((f, i) => (
            <li key={f.step} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold',
                  i < flowIndex && 'bg-primary text-primary-foreground',
                  i === flowIndex && 'bg-brand-orange text-white ring-4 ring-brand-orange/20',
                  i > flowIndex && 'bg-slate-200 text-slate-500',
                )}
              >
                {i + 1}
              </span>
              <span className={cn('hidden text-sm font-semibold md:inline', i === flowIndex ? 'text-slate-900' : 'text-slate-400')}>
                {f.label}
              </span>
              {i < FLOW.length - 1 && <span className="h-0.5 flex-1 bg-slate-200" />}
            </li>
          ))}
        </ol>
      )}

      <main className={cn('px-4 pb-10 sm:px-8 lg:px-28 lg:pb-16', (inFlow || step === 'lookup') && 'pb-28')}>{body}</main>

      {(inFlow || step === 'lookup') && (
        <SideArrow side="left" label="Kembali" onClick={step === 'lookup' ? reset : back} />
      )}
      {inFlow && step !== 'payment' && (
        <SideArrow side="right" label="Lanjut" disabled={!valid[step]} onClick={next} />
      )}

      {/* Below lg the side arrows would cover the form: back / next sit in a bar at the bottom. */}
      {(inFlow || step === 'lookup') && (
        <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="outline" className="h-14 flex-1 rounded-xl text-lg font-bold" onClick={step === 'lookup' ? reset : back}>
            <ArrowLeftIcon />
            Kembali
          </Button>
          {inFlow && step !== 'payment' && (
            <Button className="h-14 flex-[1.4] rounded-xl text-lg font-bold" disabled={!valid[step]} onClick={next}>
              Lanjut
              <ArrowRightIcon />
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
