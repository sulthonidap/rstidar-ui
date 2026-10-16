import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import LocationPicker from '@/components/LocationPicker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSaveOrganization } from '@/features/organizations/queries';
import { useSetupStatus } from '@/features/setup/queries';
import { apiErrorMessage } from '@/lib/api';
import type { LatLng } from '@/lib/geocode';
import type { Organization } from '@/types/models';

const schema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  max_distance_km: z
    .string()
    .refine((v) => v === '' || (Number(v) > 0 && Number(v) <= 1000), 'Isi antara 0 dan 1000 km, atau kosongkan'),
});

type FormValues = z.infer<typeof schema>;

/**
 * The partner RS profile: first setup (organization null) or later edits.
 * The name comes from the license and can't be edited here. The map point is
 * the pickup point of every order and where distances (pricing, service area)
 * are measured from.
 */
export default function OrganizationForm({
  organization,
  submitLabel,
  onSaved,
}: {
  organization: Organization | null;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const save = useSaveOrganization({ setup: !organization });
  const name = useSetupStatus().data?.license?.rs ?? organization?.name ?? '';
  const [point, setPoint] = useState<LatLng | null>(
    organization?.lat != null && organization?.lng != null ? [organization.lat, organization.lng] : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      phone: organization?.phone ?? '',
      address: organization?.address ?? '',
      max_distance_km: organization?.max_distance_km != null ? String(organization.max_distance_km) : '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await save.mutateAsync({
        ...values,
        lat: point?.[0] ?? null,
        lng: point?.[1] ?? null,
        max_distance_km: values.max_distance_km !== '' ? Number(values.max_distance_km) : null,
      });
      onSaved?.();
    } catch {
      // Shown above the form.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {save.isError && (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(save.error, 'Gagal menyimpan')}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Nama RS <span className="font-normal text-muted-foreground">(sesuai lisensi)</span>
          </Label>
          <Input id="name" value={name} readOnly className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" {...register('phone')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Alamat</Label>
        <Textarea id="address" rows={2} {...register('address')} />
      </div>
      <div className="space-y-1.5">
        <Label>
          Titik lokasi <span className="font-normal text-muted-foreground">(titik pickup order & acuan jarak)</span>
        </Label>
        <LocationPicker
          value={point}
          onChange={setPoint}
          initialQuery={[name, organization?.address].filter(Boolean).join(', ')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="max_distance_km">
          Wilayah layanan (km) <span className="font-normal text-muted-foreground">(kosongkan jika tanpa batas)</span>
        </Label>
        <Input id="max_distance_km" type="number" step="0.1" placeholder="Tanpa batas" {...register('max_distance_km')} />
        {errors.max_distance_km ? (
          <p className="text-xs text-destructive">{errors.max_distance_km.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Jarak terjauh (lewat jalan) dari titik RS. Order ke tujuan yang lebih jauh akan ditolak.
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
