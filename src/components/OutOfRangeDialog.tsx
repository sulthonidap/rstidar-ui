import { BanIcon } from 'lucide-react';
import { useState } from 'react';

import { formatKm } from '@/components/QuoteLine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Quote } from '@/features/public/queries';

/**
 * Popup when the destination point lands outside the RS's service area (no
 * service can take the order). Opens for every new out-of-range quote — also
 * when moving from one point outside the area to another — and closes once a
 * point is back inside. React Query keeps the same quote object when nothing
 * changed, so a mere refetch of the same point doesn't reopen it.
 */
export default function OutOfRangeDialog({ quote, rsName }: { quote: Quote | undefined; rsName: string | undefined }) {
  const [open, setOpen] = useState(!!quote?.out_of_range);
  const [seen, setSeen] = useState(quote);
  if (quote !== seen) {
    setSeen(quote);
    setOpen(!!quote?.out_of_range);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <BanIcon className="size-5 text-destructive" />
          </div>
          <DialogTitle>Mohon maaf, area Anda belum terjangkau layanan kami</DialogTitle>
          <DialogDescription>
            {quote?.distance_km != null ? `${formatKm(quote.distance_km)} km — ` : ''}
            {rsName ?? 'RS ini'} maksimal {formatKm(quote?.max_distance_km)} km.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Ubah titik tujuan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
