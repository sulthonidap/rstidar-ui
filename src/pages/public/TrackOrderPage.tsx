import { SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import Loader from '@/components/Loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrackOrder } from '@/features/public/queries';
import TrackedOrderCard from '@/pages/public/TrackedOrderCard';

/** /lacak and /lacak/:code — the code lives in the URL so a tracking link can be shared. */
export default function TrackOrderPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState(code);
  const { data: order, isLoading, isError } = useTrackOrder(code);

  // Keep the box in sync when the URL changes (e.g. back/forward).
  const [prevCode, setPrevCode] = useState(code);
  if (code !== prevCode) {
    setPrevCode(code);
    setInput(code);
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = input.trim().toUpperCase();
    if (c) navigate(`/lacak/${encodeURIComponent(c)}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-widest text-brand-orange uppercase">Lacak</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cek status order</h1>
        <p className="text-sm text-muted-foreground">Masukkan kode order yang kamu terima saat membuat order.</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={submit} className="space-y-1.5">
            <Label htmlFor="code">Kode order</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="MS-20260928-0001"
                className="h-10 font-mono"
                autoComplete="off"
              />
              <Button type="submit" className="h-10">
                <SearchIcon />
                Lacak
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {code && isLoading && <Loader label="Mencari order…" />}
      {code && isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Order dengan kode <b>{code}</b> tidak ditemukan. Cek lagi kodenya.
          </AlertDescription>
        </Alert>
      )}
      {order && <TrackedOrderCard order={order} />}
    </div>
  );
}
