import { KeyRoundIcon, LoaderCircleIcon } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useActivateLicense } from '@/features/setup/queries';
import { apiErrorMessage } from '@/lib/api';
import SetupShell from '@/pages/setup/SetupShell';

/** First run, step 1: paste the license key that came with the purchase. */
export default function ActivationPage() {
  const activate = useActivateLicense();
  const [key, setKey] = useState('');

  return (
    <SetupShell
      step={1}
      title="Aktivasi Lisensi"
      description="Masukkan kode lisensi yang Anda terima bersama aplikasi ini."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          activate.mutate(key.trim());
        }}
      >
        {activate.isError && (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(activate.error, 'Aktivasi gagal')}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="license">Kode lisensi</Label>
          <Textarea
            id="license"
            rows={4}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="MSND-…"
            className="font-mono text-xs break-all"
            spellCheck={false}
            autoFocus
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={!key.trim() || activate.isPending}>
          {activate.isPending ? <LoaderCircleIcon className="animate-spin" /> : <KeyRoundIcon />}
          Aktivasi
        </Button>
      </form>
    </SetupShell>
  );
}
