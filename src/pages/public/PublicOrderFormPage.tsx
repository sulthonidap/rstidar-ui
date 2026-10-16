import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import Loader from '@/components/Loader';
import LocationPicker from '@/components/LocationPicker';
import FormSection from '@/components/FormSection';
import PaymentMethodDialog from '@/components/PaymentMethodDialog';
import OutOfRangeDialog from '@/components/OutOfRangeDialog';
import QuoteLine, { distanceText } from '@/components/QuoteLine';
import ServiceChoice from '@/components/ServiceChoice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ReturningPatient } from '@/features/public/queries';
import { useCreatePublicOrder, usePublicOrganization, usePublicServices, useQuote } from '@/features/public/queries';
import { apiErrorMessage } from '@/lib/api';
import type { LatLng } from '@/lib/geocode';
import type { PaymentMethod } from '@/types/models';
import ReturningPatientLookup from '@/pages/public/ReturningPatientLookup';

const schema = z.object({
  service_id: z.string().min(1, 'Pilih tipe layanan'),
  // Same limits as the API (and the old Laravel form).
  customer_name: z.string().trim().min(1, 'Nama wajib diisi').max(255, 'Maksimal 255 karakter'),
  customer_phone: z
    .string()
    .trim()
    .max(30, 'Maksimal 30 karakter')
    .regex(/^[0-9+\-\s()]{6,}$/, 'Nomor HP tidak valid, contoh 081234567890'),
  dropoff_address: z.string().trim().min(1, 'Alamat tujuan wajib diisi').max(1000, 'Maksimal 1000 karakter'),
  notes: z.string().max(1000, 'Maksimal 1000 karakter').optional(),
  // Optional, same limits as the staff form.
  patient_name: z.string().trim().min(1, 'Nama pasien wajib diisi').max(255, 'Maksimal 255 karakter'),
  medical_record_no: z.string().trim().min(1, 'No. Rekam Medis wajib diisi').max(50, 'Maksimal 50 karakter'),
  website: z.string(),
});

type FormValues = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

/** Public order form (/order): orders for the partner RS. */
export default function PublicOrderFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kiosk = searchParams.get('kios') === '1';
  const { data: org, isLoading: orgLoading, isError: orgError } = usePublicOrganization();
  const { data: services } = usePublicServices();
  const create = useCreatePublicOrder();
  const [dropoffPoint, setDropoffPoint] = useState<LatLng | null>(null);
  // Valid form waiting for the payment choice in the pop-up.
  const [draft, setDraft] = useState<FormValues | null>(null);
  const [patientMode, setPatientMode] = useState<'new' | 'returning'>('new');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      service_id: '',
      customer_name: '',
      customer_phone: '',
      // Picked up at the RS pharmacy; staff can change it when editing the order.
      dropoff_address: '',
      notes: '',
      patient_name: '',
      medical_record_no: '',
      website: '',
    },
  });

  // Live price: distance tiers × road distance RS → destination (same calculation as on save).
  // Every service is quoted at once, so each card shows its own price.
  const quote = useQuote(org ? { dropoff_lat: dropoffPoint?.[0], dropoff_lng: dropoffPoint?.[1] } : null);
  const selected = quote.data?.services?.find((q) => String(q.service_id) === watch('service_id'));
  const selectedQuote = quote.data && selected ? { ...quote.data, ...selected } : undefined;
  const quoteDistance = distanceText(quote.data?.distance_km, quote.data?.distance_source);

  // The old kiosk link (/order?kios=1) now opens the full-screen kiosk.
  if (kiosk) return <Navigate to="/kios" replace />;
  if (orgLoading) return <Loader label="Memuat form…" />;
  if (orgError || !org) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h1 className="text-xl font-bold">Form order belum tersedia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Layanan pemesanan sedang disiapkan. Silakan coba lagi nanti atau hubungi petugas RS.
          </p>
        </CardContent>
      </Card>
    );
  }

  // "Pasien lama" found: fill in their last order's details (all still editable).
  const prefill = (p: ReturningPatient) => {
    const opts = { shouldValidate: true, shouldDirty: true };
    setValue('customer_name', p.customer_name, opts);
    setValue('customer_phone', p.customer_phone, opts);
    setValue('dropoff_address', p.dropoff_address, opts);
    setValue('patient_name', p.patient_name ?? '', opts);
    setValue('medical_record_no', p.medical_record_no ?? '', opts);
    if (p.dropoff_lat != null && p.dropoff_lng != null) setDropoffPoint([p.dropoff_lat, p.dropoff_lng]);
  };

  const onSubmit = (values: FormValues) => {
    create.reset();
    setDraft(values);
  };

  const placeOrder = async (payment_method: PaymentMethod) => {
    if (!draft) return;
    try {
      const { code } = await create.mutateAsync({
        ...draft,
        payment_method,
        service_id: Number(draft.service_id),
        notes: draft.notes?.trim() || undefined,
        patient_name: draft.patient_name?.trim() || undefined,
        medical_record_no: draft.medical_record_no?.trim() || undefined,
        dropoff_lat: dropoffPoint?.[0],
        dropoff_lng: dropoffPoint?.[1],
      });
      navigate(`/order/${encodeURIComponent(code)}/selesai`, { replace: true });
    } catch {
      // Shown in the pop-up (and above the form once it's closed).
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-widest text-brand-orange uppercase">Form order</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Order pengiriman — {org.name}</h1>
        <p className="text-sm text-muted-foreground">
          Order akan divalidasi petugas {org.name} sebelum dikirim.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {services?.length === 0 && (
              <Alert>
                <AlertDescription>
                  Pemesanan belum bisa dilakukan karena layanan pengiriman belum tersedia. Silakan coba lagi nanti
                  atau hubungi petugas {org.name}.
                </AlertDescription>
              </Alert>
            )}
            {create.isError && (
              <Alert variant="destructive">
                <AlertDescription>{apiErrorMessage(create.error, 'Order gagal dikirim. Coba lagi.')}</AlertDescription>
              </Alert>
            )}

            {/* Honeypot: hidden from people, bots fill it and get rejected by the API. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
              </label>
            </div>

            <FormSection
              step={1}
              title="Data pasien"
              hint="Membantu farmasi mencocokkan resep. Kosongkan kalau tidak tahu."
            >
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={patientMode}
                onValueChange={(v) => (v === 'new' || v === 'returning') && setPatientMode(v)}
                aria-label="Pasien baru atau lama"
              >
                <ToggleGroupItem value="new" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Pasien baru
                </ToggleGroupItem>
                <ToggleGroupItem value="returning" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Pasien lama
                </ToggleGroupItem>
              </ToggleGroup>
              {patientMode === 'returning' && <ReturningPatientLookup onFound={prefill} />}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="medical_record_no">
                    No. Rekam Medis
                  </Label>
                  <Input
                    id="medical_record_no"
                    autoComplete="off"
                    placeholder="Lihat di kartu berobat"
                    aria-invalid={!!errors.medical_record_no}
                    {...register('medical_record_no')}
                  />
                  <FieldError message={errors.medical_record_no?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patient_name">
                    Nama pasien
                  </Label>
                  <Input
                    id="patient_name"
                    autoComplete="off"
                    placeholder="Sesuai kartu berobat"
                    aria-invalid={!!errors.patient_name}
                    {...register('patient_name')}
                  />
                  <FieldError message={errors.patient_name?.message} />
                </div>
              </div>
            </FormSection>

            <FormSection step={2} title="Penerima" hint="Orang yang akan menerima paket di alamat tujuan.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_name">Nama penerima</Label>
                  <Input id="customer_name" autoComplete="name" aria-invalid={!!errors.customer_name} {...register('customer_name')} />
                  <FieldError message={errors.customer_name?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer_phone">Nomor HP / WhatsApp</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08xx"
                    aria-invalid={!!errors.customer_phone}
                    {...register('customer_phone')}
                  />
                  <FieldError message={errors.customer_phone?.message} />
                </div>
              </div>
            </FormSection>

            <FormSection step={3} title="Alamat tujuan">
              <div className="space-y-1.5">
                <Label htmlFor="dropoff_address">Alamat lengkap</Label>
                <Textarea
                  id="dropoff_address"
                  rows={3}
                  placeholder="Nama jalan, nomor, RT/RW, kelurahan, kecamatan, kota"
                  aria-invalid={!!errors.dropoff_address}
                  {...register('dropoff_address')}
                />
                <FieldError message={errors.dropoff_address?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Titik lokasi <span className="font-normal text-muted-foreground">(opsional, untuk biaya sesuai jarak)</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sedang di alamat tujuan? Tekan <b>Lokasi saya</b>. Bisa juga tempel link lokasi dari Google Maps/WhatsApp.
                </p>
                <LocationPicker
                  value={dropoffPoint}
                  onChange={setDropoffPoint}
                  pinLabel="Tujuan"
                  pinColor="#F07A22"
                  reference={org.lat != null && org.lng != null ? { point: [org.lat, org.lng], label: org.name } : null}
                  route={quote.data?.route}
                  distanceLabel={quoteDistance ? `${quoteDistance} dari ${org.name}` : null}
                  allowMyLocation
                  placeholder="Cari alamat, atau tempel link Google Maps / lokasi WhatsApp"
                />
              </div>
            </FormSection>

            <FormSection step={4} title="Layanan" hint="Harga menyesuaikan jarak dari RS ke titik lokasi tujuan.">
              <Controller
                control={control}
                name="service_id"
                render={({ field }) => (
                  <ServiceChoice
                    services={services}
                    quote={quote.data}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.service_id}
                  />
                )}
              />
              <FieldError message={errors.service_id?.message} />
            </FormSection>

            <FormSection step={5} title="Catatan" hint="Opsional, mis. patokan rumah atau pesan untuk petugas.">
              <Textarea id="notes" rows={2} aria-label="Catatan" {...register('notes')} />
              <FieldError message={errors.notes?.message} />
            </FormSection>

            <QuoteLine quote={selectedQuote} loading={quote.isFetching} />
            <OutOfRangeDialog quote={quote.data} rsName={org.name} />

            <Button type="submit" className="h-11 w-full text-base" disabled={create.isPending || quote.data?.out_of_range}>
              Buat order
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Dengan membuat order, kamu setuju datamu diproses untuk keperluan pengiriman.
            </p>
          </form>
          <PaymentMethodDialog
            open={!!draft}
            onOpenChange={(v) => !v && setDraft(null)}
            price={selectedQuote?.price}
            pending={create.isPending}
            error={create.isError ? apiErrorMessage(create.error, 'Order gagal dibuat. Coba lagi.') : null}
            onConfirm={placeOrder}
          />
        </CardContent>
      </Card>
    </div>
  );
}
