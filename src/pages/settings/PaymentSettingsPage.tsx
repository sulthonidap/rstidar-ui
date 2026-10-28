import { LoaderCircleIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import Loader from '@/components/Loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PaymentInfo } from '@/features/payments/queries';
import { usePaymentSettings, useQrisUpload, useUpdatePaymentSettings } from '@/features/payments/queries';
import { apiErrorMessage, fileUrl } from '@/lib/api';
import FreeProgramCard from '@/pages/settings/FreeProgramCard';

type Fields = Omit<PaymentInfo, 'qris_url'>;

/** Where patients pay non-cash orders: the bank account and a QRIS image (Admin). */
export default function PaymentSettingsPage() {
  const { data, isLoading } = usePaymentSettings();
  const save = useUpdatePaymentSettings();
  const qris = useQrisUpload();
  const fileInput = useRef<HTMLInputElement>(null);

  // Local edits on top of the loaded settings.
  const [edits, setEdits] = useState<Partial<Fields>>({});
  if (isLoading || !data) return <Loader label="Memuat pengaturan…" />;
  const form: Fields = {
    bank_name: edits.bank_name ?? data.bank_name,
    account_no: edits.account_no ?? data.account_no,
    account_name: edits.account_name ?? data.account_name,
    instructions: edits.instructions ?? data.instructions,
  };
  const field = (key: keyof Fields) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEdits((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="grid max-w-4xl gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekening bank</CardTitle>
          <CardDescription>Ditampilkan ke pemesan yang memilih bayar non-tunai.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form, { onSuccess: () => setEdits({}) });
            }}
          >
            {save.isError && (
              <Alert variant="destructive">
                <AlertDescription>{apiErrorMessage(save.error, 'Gagal menyimpan')}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Bank</Label>
                <Input id="bank_name" placeholder="BCA" {...field('bank_name')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account_no">Nomor rekening</Label>
                <Input id="account_no" inputMode="numeric" placeholder="1234567890" {...field('account_no')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account_name">Atas nama</Label>
              <Input id="account_name" placeholder="PT MedSend Indonesia" {...field('account_name')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instructions">
                Petunjuk tambahan <span className="font-normal text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="instructions"
                rows={3}
                placeholder="Mis. transfer sesuai nominal persis, bukti diverifikasi maks. 1 jam di jam kerja."
                {...field('instructions')}
              />
            </div>
            <Button type="submit" disabled={save.isPending || Object.keys(edits).length === 0}>
              {save.isPending && <LoaderCircleIcon className="animate-spin" />}
              Simpan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">QRIS</CardTitle>
          <CardDescription>Gambar QRIS statis (PNG/JPG, maks. 3 MB).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.qris_url ? (
            <img
              src={fileUrl(data.qris_url)}
              alt="QRIS"
              className="mx-auto aspect-square w-full max-w-60 rounded-lg border bg-white object-contain p-2"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-60 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Belum ada QRIS
            </div>
          )}
          {qris.isError && <p className="text-xs text-destructive">{apiErrorMessage(qris.error, 'Gagal mengunggah')}</p>}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) qris.mutate(f);
              e.target.value = '';
            }}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={qris.isPending}>
              {qris.isPending ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
              {data.qris_url ? 'Ganti' : 'Unggah'}
            </Button>
            {data.qris_url && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => qris.mutate(null)} disabled={qris.isPending}>
                <Trash2Icon />
                Hapus
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <FreeProgramCard />
    </div>
  );
}
