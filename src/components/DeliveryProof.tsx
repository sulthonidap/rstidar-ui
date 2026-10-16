import { MapPinIcon, PackageCheckIcon } from 'lucide-react';
import { useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fileUrl } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { OrderDelivery } from '@/types/models';
import { RECEIVER_RELATION_LABELS } from '@/types/models';

type Proof = Pick<OrderDelivery, 'receiver_name' | 'receiver_relation' | 'photo_urls' | 'thumb_urls' | 'delivered_at'> &
  Partial<Pick<OrderDelivery, 'note' | 'lat' | 'lng' | 'accuracy_m' | 'delivered_by_user'>>;

/**
 * Proof of delivery: photo thumbnails (click to enlarge), who received the
 * package and when; on internal pages also the courier, note and GPS point.
 * Without a proof yet, a short placeholder.
 */
export default function DeliveryProof({ proof, pendingText }: { proof: Proof | null | undefined; pendingText: string }) {
  const [open, setOpen] = useState<string | null>(null);

  if (!proof) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <PackageCheckIcon className="size-5 shrink-0" />
        {pendingText}
      </div>
    );
  }

  const photos = proof.photo_urls.map(fileUrl);
  // Grid shows the small thumbnails; the dialog opens the full photo.
  const thumbs = photos.map((full, i) => (proof.thumb_urls?.[i] ? fileUrl(proof.thumb_urls[i]) : full));
  const hasPoint = proof.lat != null && proof.lng != null;

  return (
    // Wide cards: details on the left, photos on the right at a fixed size
    // (phones: photos on top).
    <div className="flex flex-col gap-4 md:flex-row-reverse md:items-start">
      <div className="grid grid-cols-3 gap-2 md:flex md:shrink-0">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(src)}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted md:size-36 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label={`Lihat foto bukti ${i + 1}`}
          >
            <img
              src={thumbs[i]}
              alt={`Foto bukti terima ${i + 1}`}
              loading="lazy"
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Diterima oleh</dt>
          <dd className="font-medium">
            {proof.receiver_name}{' '}
            <span className="font-normal text-muted-foreground">
              ({RECEIVER_RELATION_LABELS[proof.receiver_relation] ?? proof.receiver_relation})
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Waktu</dt>
          <dd className="font-medium">{formatDateTime(proof.delivered_at)}</dd>
        </div>
        {proof.delivered_by_user && (
          <div>
            <dt className="text-xs text-muted-foreground">Kurir</dt>
            <dd>{proof.delivered_by_user.name}</dd>
          </div>
        )}
        {proof.lat !== undefined && (
          <div>
            <dt className="text-xs text-muted-foreground">Lokasi serah terima</dt>
            <dd>
              {hasPoint ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${proof.lat},${proof.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MapPinIcon className="size-3.5" />
                  Buka di Maps
                  {proof.accuracy_m != null && <span className="text-muted-foreground">(±{proof.accuracy_m} m)</span>}
                </a>
              ) : (
                <span className="text-muted-foreground">GPS tidak tersedia</span>
              )}
            </dd>
          </div>
        )}
        {proof.note && (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Catatan kurir</dt>
            <dd>{proof.note}</dd>
          </div>
        )}
      </dl>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Foto bukti terima</DialogTitle>
            <DialogDescription>
              Diterima oleh {proof.receiver_name} · {formatDateTime(proof.delivered_at)}
            </DialogDescription>
          </DialogHeader>
          {open && <img src={open} alt="Foto bukti terima" className="max-h-[70vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
