import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, TagIcon, TriangleAlertIcon, UserRoundCheckIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCreateOrder } from '@/features/orders/queries';
import { useOrganization } from '@/features/organizations/queries';
import { usePublicServices, useQuote } from '@/features/public/queries';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import type { ScheduleValue } from '@/components/SchedulePicker';
import SchedulePicker from '@/components/SchedulePicker';
import LocationPicker from '@/components/LocationPicker';
import FormSection from '@/components/FormSection';
import RegionFields from '@/components/RegionFields';
import PharmacyFields, { NO_PHARMACY, pharmacyError, pharmacyPayload, type PharmacyValue } from '@/components/PharmacyFields';
import FreeProgramFields, { NO_FREE_PROGRAM, type FreeProgramValue } from '@/components/FreeProgramFields';
import { useFreeProgram } from '@/features/free-program/queries';
import PaymentMethodDialog from '@/components/PaymentMethodDialog';
import OutOfRangeDialog from '@/components/OutOfRangeDialog';
import QuoteLine, { distanceText } from '@/components/QuoteLine';
import ServiceChoice from '@/components/ServiceChoice';
import type { LatLng } from '@/lib/geocode';
import CustomerPicker from '@/pages/orders/CustomerPicker';
import type { Customer, PaymentMethod } from '@/types/models';

type CustomerMode = 'existing' | 'new';

// Same rules as the public form (and the API's validateOrderFields).
const schema = z.object({
  service_id: z.string().min(1, 'Pilih tipe layanan'),
  customer_name: z.string().trim().min(1, 'Nama wajib diisi').max(255, 'Maksimal 255 karakter'),
  customer_phone: z
    .string()
    .trim()
    .max(30, 'Maksimal 30 karakter')
    // "*" = a saved customer's masked number, sent back unchanged (the API restores it).
    .regex(/^[0-9+\-\s()*]{6,}$/, 'Nomor HP tidak valid, contoh 081234567890'),
  dropoff_address: z.string().trim().min(1, 'Alamat tujuan wajib diisi').max(1000, 'Maksimal 1000 karakter'),
  notes: z.string().max(1000, 'Maksimal 1000 karakter').optional(),
  patient_name: z.string().trim().min(1, 'Nama pasien wajib diisi').max(255, 'Maksimal 255 karakter'),
  medical_record_no: z.string().trim().min(1, 'No. Rekam Medis wajib diisi').max(50, 'Maksimal 50 karakter'),
});

type FormValues = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

/**
 * Internal order (/orders/baru) made by staff — e.g. a CCO taking an order by
 * phone. It skips validation and starts as "Confirmed". A CCO's RS is fixed to
 * their own; an admin picks the RS.
 *
 * Customer lama: search the saved customers and prefill name/phone/address.
 * Customer baru: type them in; "simpan" adds them to the list for next time.
 */
export default function CreateOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: services } = usePublicServices();
  // The partner RS: pickup point and where distances are measured from.
  const { data: rsOrg } = useOrganization();
  const create = useCreateOrder();
  const [mode, setMode] = useState<CustomerMode>('existing');
  const [picked, setPicked] = useState<Customer | null>(null);
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleValue>({ date: '', slot: '' });
  const [dropoffPoint, setDropoffPoint] = useState<LatLng | null>(null);
  // Valid form waiting for the payment choice in the pop-up.
  const [draft, setDraft] = useState<FormValues | null>(null);
  const [freeProgram, setFreeProgram] = useState<FreeProgramValue>(NO_FREE_PROGRAM);
  const { data: program } = useFreeProgram();
  const isFree = !!program?.enabled && freeProgram.category !== 'umum' && freeProgram.domicileChecked;
  const isFarmasi = hasRole(user, 'farmasi');
  const [pharmacy, setPharmacy] = useState<PharmacyValue>(NO_PHARMACY);
  // Shown once the staff tried to submit.
  const [checkPharmacy, setCheckPharmacy] = useState(false);
  const pharmacyMissing = pharmacyError(pharmacy);
  // Kelurahan/desa tujuan (inside the service area).
  const [region, setRegion] = useState('');
  const regionMissing = region ? null : 'Pilih kelurahan/desa tujuan';

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      service_id: '',
      customer_name: '',
      customer_phone: '',
      dropoff_address: '',
      notes: '',
      patient_name: '',
      medical_record_no: '',
    },
  });

  const [pickError, setPickError] = useState<string | null>(null);

  const fillFrom = (customer: Customer | null) => {
    setPicked(customer);
    setPickError(null);
    const opts = { shouldValidate: !!customer, shouldDirty: true };
    setValue('customer_name', customer?.name ?? '', opts);
    setValue('customer_phone', customer?.phone ?? '', opts);
    setValue('dropoff_address', customer?.address ?? '', opts);
    setDropoffPoint(customer?.lat != null && customer?.lng != null ? [customer.lat, customer.lng] : null);
    setRegion(customer?.region_code ?? '');
    if (!customer) clearErrors(['customer_name', 'customer_phone', 'dropoff_address']);
  };

  // In 'Customer lama' the recipient fields appear once a customer is picked (prefilled).
  const showCustomerFields = mode === 'new' || !!picked;

  const rsReference =
    rsOrg?.lat != null && rsOrg?.lng != null ? { point: [rsOrg.lat, rsOrg.lng] as LatLng, label: rsOrg.name } : null;

  // Live price: distance tiers × road distance RS → destination (same calculation as on save).
  // Every service is quoted at once, so each card shows its own price.
  const quote = useQuote({
    dropoff_lat: dropoffPoint?.[0],
    dropoff_lng: dropoffPoint?.[1],
    dropoff_region_code: region || undefined,
  });
  const selected = quote.data?.services?.find((q) => String(q.service_id) === watch('service_id'));
  const selectedQuote = quote.data && selected ? { ...quote.data, ...selected } : undefined;
  const quoteDistance = distanceText(quote.data?.distance_km, quote.data?.distance_source);

  const changeMode = (next: string) => {
    if (next !== 'existing' && next !== 'new') return; // ToggleGroup sends '' when re-clicking the active item
    setMode(next);
    fillFrom(null);
  };

  // Nothing picked yet: the hidden recipient fields fail validation — point at the picker instead.
  const onInvalid = () => {
    setCheckPharmacy(true);
    if (mode === 'existing' && !picked) setPickError('Pilih customer dari daftar, atau pakai "Customer baru".');
  };

  const onSubmit = (values: FormValues) => {
    setCheckPharmacy(true);
    if (pharmacyMissing || (showCustomerFields && regionMissing)) return;
    if (mode === 'existing' && !picked) {
      setPickError('Pilih customer dari daftar, atau pakai "Customer baru".');
      return;
    }
    create.reset();
    // Free (program ongkir gratis): nothing to pay, so no payment pop-up.
    if (isFree) {
      void placeOrder('cash', values);
      return;
    }
    setDraft(values);
  };

  // After the payment is picked in the pop-up.
  const placeOrder = async (payment_method: PaymentMethod, values: FormValues | null = draft) => {
    if (!values) return;
    try {
      const order = await create.mutateAsync({
        service_id: Number(values.service_id),
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        dropoff_address: values.dropoff_address,
        notes: values.notes?.trim() || undefined,
        customer_id: mode === 'existing' ? picked?.id : undefined,
        save_customer: mode === 'new' && saveCustomer,
        patient_name: values.patient_name?.trim() || undefined,
        medical_record_no: values.medical_record_no?.trim() || undefined,
        scheduled_date: schedule.date || undefined,
        scheduled_slot: schedule.date ? schedule.slot || undefined : undefined,
        dropoff_lat: dropoffPoint?.[0],
        dropoff_lng: dropoffPoint?.[1],
        payment_method,
        patient_category: freeProgram.category,
        domicile_checked: freeProgram.domicileChecked,
        ...pharmacyPayload(pharmacy),
        dropoff_region_code: region,
      });
      navigate(`/orders/${order.id}`, { replace: true, state: { created: true } });
    } catch {
      // Shown in the pop-up (and above the form once it's closed).
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeftIcon className="size-4" />
        Kembali ke Order
      </Link>

      {/* Forms read better at a limited width: heading + form sit centered. */}
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Buat order</h2>
          <p className="text-sm text-muted-foreground">
            {isFarmasi
              ? 'Order dari farmasi langsung berstatus Siap diambil: CCO diberi tahu untuk mengambil obat, Ops untuk menugaskan kurir.'
              : 'Order internal (mis. dari telepon) langsung berstatus Dikonfirmasi, tinggal ditugaskan ke kurir.'}
          </p>
        </div>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>
              {services?.length === 0 && (
                <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  <TriangleAlertIcon />
                  <AlertTitle>Belum ada tipe layanan</AlertTitle>
                  <AlertDescription className="text-inherit">
                    {hasRole(user, 'admin') ? (
                      <>
                        <p>Tambahkan minimal satu tipe layanan beserta tarifnya supaya order bisa dibuat.</p>
                        <Button asChild size="sm" className="mt-2">
                          <Link to="/services">
                            <TagIcon />
                            Atur tipe layanan
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <p>Order belum bisa dibuat. Minta admin menambahkan tipe layanan dulu.</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {create.isError && (
                <Alert variant="destructive">
                  <AlertDescription>{apiErrorMessage(create.error, 'Order gagal dibuat. Coba lagi.')}</AlertDescription>
                </Alert>
              )}


              <FormSection step={1} title="Penerima" hint="Pilih dari daftar customer, atau isi customer baru.">
                <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Label>Customer</Label>
                    <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={changeMode}>
                      <ToggleGroupItem value="existing" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        Customer lama
                      </ToggleGroupItem>
                      <ToggleGroupItem value="new" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        Customer baru
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {mode === 'existing' ? (
                    picked ? (
                      <div className="flex items-start justify-between gap-3 rounded-md border bg-background p-3">
                        <div className="flex gap-3">
                          <UserRoundCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-semibold">{picked.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {picked.phone} · {picked.address}
                            </p>
                            {picked.notes && <p className="mt-1 text-xs text-muted-foreground">Catatan: {picked.notes}</p>}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => fillFrom(null)}>
                          <XIcon />
                          Ganti
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <CustomerPicker
                          invalid={!!pickError}
                          onPick={fillFrom}
                        />
                        <FieldError message={pickError ?? undefined} />
                      </div>
                    )
                  ) : (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={saveCustomer} onCheckedChange={(v) => setSaveCustomer(v === true)} />
                      Simpan ke daftar customer supaya bisa dipilih lagi nanti
                    </label>
                  )}
                  {mode === 'existing' && picked && (
                    <p className="text-xs text-muted-foreground">
                      Data di bawah sudah terisi otomatis. Kalau diubah, cuma berlaku untuk order ini.
                    </p>
                  )}
                </div>

                {showCustomerFields && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="customer_name">Nama penerima</Label>
                      <Input id="customer_name" aria-invalid={!!errors.customer_name} {...register('customer_name')} />
                      <FieldError message={errors.customer_name?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customer_phone">Nomor HP / WhatsApp</Label>
                      <Input
                        id="customer_phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="08xx"
                        aria-invalid={!!errors.customer_phone}
                        {...register('customer_phone')}
                      />
                      <FieldError message={errors.customer_phone?.message} />
                    </div>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="patient_name">
                      Nama pasien
                    </Label>
                    <Input id="patient_name" placeholder="Sesuai kartu berobat" aria-invalid={!!errors.patient_name} {...register('patient_name')} />
                    <FieldError message={errors.patient_name?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="medical_record_no">
                      No. Rekam Medis
                    </Label>
                    <Input id="medical_record_no" placeholder="Lihat di kartu berobat" aria-invalid={!!errors.medical_record_no} {...register('medical_record_no')} />
                    <FieldError message={errors.medical_record_no?.message} />
                  </div>
                </div>

                <PharmacyFields
                  value={pharmacy}
                  onChange={setPharmacy}
                  error={checkPharmacy ? pharmacyMissing : null}
                />

                <FreeProgramFields value={freeProgram} onChange={setFreeProgram} price={selectedQuote?.price} />
              </FormSection>

              <FormSection step={2} title="Alamat tujuan">
                {showCustomerFields ? (
                  <>
                    <RegionFields
                      key={picked?.id ?? 'new'}
                      value={region}
                      onChange={setRegion}
                      error={checkPharmacy ? regionMissing : null}
                      pointRegion={quote.data?.point_region}
                      outsideArea={quote.data?.outside_area}
                    />
                    <div className="space-y-1.5">
                      <Label htmlFor="dropoff_address">Alamat lengkap</Label>
                      <Textarea
                        id="dropoff_address"
                        rows={3}
                        placeholder="Nama jalan, nomor, RT/RW, patokan"
                        aria-invalid={!!errors.dropoff_address}
                        {...register('dropoff_address')}
                      />
                      <FieldError message={errors.dropoff_address?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Titik lokasi <span className="font-normal text-muted-foreground">(opsional, untuk biaya sesuai jarak)</span>
                      </Label>
                      <LocationPicker
                        value={dropoffPoint}
                        onChange={setDropoffPoint}
                        pinLabel="Tujuan"
                        pinColor="#F07A22"
                        reference={rsReference}
                        route={quote.data?.route}
                        distanceLabel={quoteDistance && rsOrg ? `${quoteDistance} dari ${rsOrg.name}` : null}
                        allowMyLocation
                      />
                    </div>
                  </>
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Pilih customer dulu, alamatnya akan terisi otomatis.
                  </p>
                )}
              </FormSection>

              <FormSection step={3} title="Pengiriman" hint="Harga layanan menyesuaikan jarak dari RS ke titik lokasi tujuan.">
                <div className="space-y-1.5">
                  <Label>Tipe layanan</Label>
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
                        free={isFree}
                      />
                    )}
                  />
                  <FieldError message={errors.service_id?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Jadwal kirim</Label>
                  <SchedulePicker value={schedule} onChange={setSchedule} />
                </div>
              </FormSection>

              <FormSection step={4} title="Catatan" hint="Opsional, mis. patokan rumah atau pesan untuk kurir.">
                <Textarea id="notes" rows={2} aria-label="Catatan" {...register('notes')} />
                <FieldError message={errors.notes?.message} />
              </FormSection>

              <QuoteLine quote={selectedQuote} loading={quote.isFetching} free={isFree} />
              <OutOfRangeDialog quote={quote.data} rsName={rsOrg?.name} />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link to="/orders">Batal</Link>
                </Button>
                <Button type="submit" disabled={create.isPending || quote.data?.out_of_range || quote.data?.outside_area}>
                  Buat order
                </Button>
              </div>
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
    </div>
  );
}
