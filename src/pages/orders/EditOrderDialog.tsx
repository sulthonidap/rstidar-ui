import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateOrder } from '@/features/orders/queries';
import { usePublicServices, useQuote } from '@/features/public/queries';
import OutOfRangeDialog from '@/components/OutOfRangeDialog';
import { distanceText, formatKm } from '@/components/QuoteLine';
import { apiErrorMessage } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import type { LatLng } from '@/lib/geocode';
import LocationPicker from '@/components/LocationPicker';
import RegionFields from '@/components/RegionFields';
import PharmacyFields, { pharmacyError, pharmacyOf, pharmacyPayload, type PharmacyValue } from '@/components/PharmacyFields';
import FreeProgramFields, { type FreeProgramValue } from '@/components/FreeProgramFields';
import { useFreeProgram } from '@/features/free-program/queries';
import type { ScheduleValue } from '@/components/SchedulePicker';
import SchedulePicker from '@/components/SchedulePicker';
import type { Order } from '@/types/models';

// Same rules as the create form (and the API's validateOrderFields).
const schema = z.object({
  service_id: z.string().min(1, 'Pilih tipe layanan'),
  customer_name: z.string().trim().min(1, 'Nama wajib diisi').max(255, 'Maksimal 255 karakter'),
  customer_phone: z
    .string()
    .trim()
    .max(30, 'Maksimal 30 karakter')
    // "*" = the masked number the panel shows, sent back unchanged (the API restores it).
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

/** Correct an order's recipient, addresses, service or notes (CCO/Admin). */
export function EditOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateOrder(order.id);
  const { data: services } = usePublicServices();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      service_id: order.service_id ? String(order.service_id) : '',
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      dropoff_address: order.dropoff_address,
      notes: order.notes ?? '',
      patient_name: order.patient_name ?? '',
      medical_record_no: order.medical_record_no ?? '',
    },
  });
  const [dropoffPoint, setDropoffPoint] = useState<LatLng | null>(
    order.dropoff_lat != null && order.dropoff_lng != null ? [order.dropoff_lat, order.dropoff_lng] : null,
  );
  const rsOrg = order.organization;
  const rsReference =
    rsOrg?.lat != null && rsOrg?.lng != null ? { point: [rsOrg.lat, rsOrg.lng] as LatLng, label: rsOrg.name } : null;
  const [schedule, setSchedule] = useState<ScheduleValue>({
    date: order.scheduled_date?.slice(0, 10) ?? '',
    slot: order.scheduled_slot ?? '',
  });

  const serviceId = Number(watch('service_id')) || 0;
  const quote = useQuote(
    open && serviceId
      ? {
          service_id: serviceId,
          dropoff_lat: dropoffPoint?.[0],
          dropoff_lng: dropoffPoint?.[1],
        }
      : null,
  );
  const quoteDistance = distanceText(quote.data?.distance_km, quote.data?.distance_source);
  const [freeProgram, setFreeProgram] = useState<FreeProgramValue>({
    category: order.patient_category ?? 'umum',
    domicileChecked: !!order.domicile_checked,
  });
  const { data: program } = useFreeProgram();
  // Public/kiosk orders come without farmasi; once picked it must be complete.
  const [pharmacy, setPharmacy] = useState<PharmacyValue>(() => pharmacyOf(order));
  const [checkPharmacy, setCheckPharmacy] = useState(false);
  const pharmacyMissing = pharmacy.careType ? pharmacyError(pharmacy) : null;
  // Orders from before wilayah layanan have none; empty = keep as is.
  const [region, setRegion] = useState(order.dropoff_region_code ?? '');
  const isFree = !!program?.enabled && freeProgram.category !== 'umum' && freeProgram.domicileChecked;
  // A free order costs Rp0 whatever the tariff.
  const newPrice = quote.data ? (isFree ? 0 : quote.data.price) : undefined;
  const priceChanged = newPrice !== undefined && newPrice !== order.price;
  const outOfRange = !!quote.data?.out_of_range;

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setCheckPharmacy(true);
    if (pharmacyMissing) return;
    try {
      await update.mutateAsync({
        ...values,
        service_id: Number(values.service_id),
        notes: values.notes?.trim() || undefined,
        patient_name: values.patient_name?.trim() || undefined,
        medical_record_no: values.medical_record_no?.trim() || undefined,
        scheduled_date: schedule.date || undefined,
        scheduled_slot: schedule.date ? schedule.slot || undefined : undefined,
        dropoff_lat: dropoffPoint?.[0] ?? null,
        dropoff_lng: dropoffPoint?.[1] ?? null,
        patient_category: freeProgram.category,
        domicile_checked: freeProgram.domicileChecked,
        ...pharmacyPayload(pharmacy),
        dropoff_region_code: region || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal menyimpan perubahan'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setError(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit order {order.code}</DialogTitle>
          <DialogDescription>
            Perubahan tercatat di riwayat. Kalau alamat diubah, titik petanya dicari ulang dari alamat baru.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="edit_service_id">Tipe layanan</Label>
            <Controller
              control={control}
              name="service_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit_service_id" className="w-full" aria-invalid={!!errors.service_id}>
                    <SelectValue placeholder="— pilih layanan —" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} — {formatRupiah(s.price_base)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {outOfRange ? (
              <p className="text-xs text-destructive">
                Di luar wilayah layanan RS: {quoteDistance}, maks. {formatKm(quote.data?.max_distance_km)} km. Periksa
                titik lokasi tujuan.
              </p>
            ) : priceChanged && (
              <p className="text-xs text-muted-foreground">
                Harga ikut berubah: {formatRupiah(order.price)} → {formatRupiah(newPrice)}
              </p>
            )}
            <FieldError message={errors.service_id?.message} />
            <OutOfRangeDialog quote={quote.data} rsName={rsOrg?.name} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit_customer_name">Nama penerima</Label>
              <Input id="edit_customer_name" aria-invalid={!!errors.customer_name} {...register('customer_name')} />
              <FieldError message={errors.customer_name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_customer_phone">Nomor HP / WhatsApp</Label>
              <Input
                id="edit_customer_phone"
                type="tel"
                inputMode="tel"
                aria-invalid={!!errors.customer_phone}
                {...register('customer_phone')}
              />
              <FieldError message={errors.customer_phone?.message} />
            </div>
          </div>
          <RegionFields value={region} onChange={setRegion} currentLabel={order.dropoff_region} />
          <div className="space-y-1.5">
            <Label htmlFor="edit_dropoff_address">Alamat tujuan lengkap</Label>
            <Textarea id="edit_dropoff_address" rows={3} aria-invalid={!!errors.dropoff_address} {...register('dropoff_address')} />
            <FieldError message={errors.dropoff_address?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>
              Titik lokasi tujuan <span className="font-normal text-muted-foreground">(opsional)</span>
            </Label>
            {open && (
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
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit_patient_name">
                Nama pasien
              </Label>
              <Input id="edit_patient_name" aria-invalid={!!errors.patient_name} {...register('patient_name')} />
              <FieldError message={errors.patient_name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_medical_record_no">
                No. Rekam Medis
              </Label>
              <Input id="edit_medical_record_no" aria-invalid={!!errors.medical_record_no} {...register('medical_record_no')} />
              <FieldError message={errors.medical_record_no?.message} />
            </div>
          </div>
          <PharmacyFields
            value={pharmacy}
            onChange={setPharmacy}
            error={checkPharmacy ? pharmacyMissing : null}
            currentWard={order.ward}
          />
          <FreeProgramFields value={freeProgram} onChange={setFreeProgram} price={quote.data?.price} />
          <div className="space-y-1.5">
            <Label>Jadwal kirim</Label>
            <SchedulePicker value={schedule} onChange={setSchedule} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_notes">
              Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
            </Label>
            <Textarea id="edit_notes" rows={2} {...register('notes')} />
            <FieldError message={errors.notes?.message} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || outOfRange}>
              {isSubmitting ? 'Menyimpan…' : 'Simpan perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
