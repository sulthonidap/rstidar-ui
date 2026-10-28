import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import type { Ref } from 'react';
import { useEffect, useRef, useState } from 'react';

import { formatDateTime, formatRupiah } from '@/lib/format';
import { PAYMENT_STATUS_LABELS } from '@/lib/payment';
import { formatSchedule } from '@/lib/schedule';
import { pharmacyDetail } from '@/components/OrderPharmacy';
import { CARE_TYPE_LABELS, type Order } from '@/types/models';

/** CSS for printing a ShippingLabel on 100×150 mm thermal paper (see printElement). */
export const SHIPPING_LABEL_PRINT_CSS = `
  @page { size: 100mm 150mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .label-stack { display: block !important; padding: 0 !important; }
  .label-frame { box-shadow: none !important; }
  .label-sheet { break-after: page; }
  .label-frame:last-child .label-sheet { break-after: auto; }
`;

/** Public tracking page for an order (opened from the QR on the customer's stub). */
const trackUrl = (code: string) => `${window.location.origin}/lacak/${encodeURIComponent(code)}`;

/**
 * 100×150 mm thermal sheet, cut in two:
 *  - top ¾: the shipping label stuck on the package (service, Code128 barcode of
 *    the order code, recipient, sender, courier);
 *  - bottom ¼, below a scissors line: a stub handed to whoever placed the order,
 *    with the order code and a QR to its tracking page.
 * `order` is the panel's (masked) order: the package label shows masked patient
 * data, since anyone handling the package can read it (the courier has the full
 * data in the app). `stubOrder` is the full order, used only for the stub the
 * patient keeps. `onReady` fires once the barcode and the QR are drawn.
 */
export default function ShippingLabel({
  order,
  stubOrder = order,
  ref,
  onReady,
}: {
  order: Order;
  stubOrder?: Order;
  ref?: Ref<HTMLElement>;
  onReady?: () => void;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [qr, setQr] = useState<string | null>(null);
  // The dialog passes a new callback each render; only the latest one matters.
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    if (!barcodeRef.current) return;
    const svg = barcodeRef.current;
    JsBarcode(svg, order.code, { format: 'CODE128', displayValue: false, margin: 0, height: 80, width: 2 });
    // Let CSS size the barcode: turn its fixed pixel size into a viewBox.
    const w = svg.getAttribute('width');
    const h = svg.getAttribute('height');
    if (w && h) {
      svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
    }
    let alive = true;
    QRCode.toDataURL(trackUrl(order.code), { margin: 0, width: 240, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!alive) return;
        setQr(url);
        onReadyRef.current?.();
      })
      .catch(() => alive && onReadyRef.current?.()); // the label still prints without the QR
    return () => {
      alive = false;
    };
  }, [order.code]);

  const org = order.organization;
  const patient =
    stubOrder.patient_name && stubOrder.patient_name !== stubOrder.customer_name ? stubOrder.patient_name : null;
  const payment = order.transaction?.payment_status;

  return (
    <article
      ref={ref}
      className="label-sheet flex h-[150mm] w-[100mm] shrink-0 flex-col overflow-hidden bg-white text-[9pt] leading-snug text-black [print-color-adjust:exact]"
    >
      {/* ── Top ¾: the label stuck on the package ── */}
      <div className="flex h-[111mm] flex-col overflow-hidden px-[4mm] pt-[3.5mm]">
        {/* Brand + service */}
        <header className="flex items-center justify-between border-b-2 border-black pb-[1.5mm]">
          <div className="flex items-center gap-[2mm]">
            <img src="/logo.png" alt="" className="size-[7mm] object-contain" />
            <span className="text-[13pt] font-extrabold tracking-tight">MedSend</span>
          </div>
          <span className="rounded-[1mm] bg-black px-[3mm] py-[0.8mm] text-[10pt] font-extrabold tracking-wide text-white uppercase">
            {order.service?.name ?? '—'}
          </span>
        </header>

        {/* Barcode */}
        <section className="flex flex-col items-center border-b-2 border-black py-[2mm]">
          <svg ref={barcodeRef} className="h-[13mm] w-full" />
          <p className="mt-[1mm] font-mono text-[12pt] font-bold tracking-wider">{order.code}</p>
        </section>

        {/* Recipient */}
        <section className="border-b border-black py-[1.5mm]">
          <p className="text-[7pt] font-bold tracking-widest uppercase">Penerima</p>
          <p className="text-[11pt] font-bold">{order.customer_name}</p>
          <p className="font-semibold">{order.customer_phone}</p>
          <p className="mt-[0.5mm] line-clamp-2">{order.dropoff_address}</p>
        </section>

        {/* Sender */}
        <section className="border-b border-black py-[1.5mm]">
          <p className="text-[7pt] font-bold tracking-widest uppercase">Pengirim</p>
          <p className="font-bold">
            {org?.name ?? 'MedSend'}
            {org?.phone && <span className="font-normal"> · {org.phone}</span>}
          </p>
          <p className="line-clamp-1">{order.pickup_address}</p>
        </section>

        {/* Details */}
        <footer className="min-h-0 pt-[1.5mm]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-[2mm] gap-y-[0.3mm] text-[8pt]">
            <dt className="font-bold">Kurir</dt>
            <dd>{order.courier?.user?.name ?? '—'}</dd>
            {order.care_type && (
              <>
                <dt className="font-bold">Farmasi</dt>
                <dd className="font-bold">
                  {[CARE_TYPE_LABELS[order.care_type], pharmacyDetail(order)].filter(Boolean).join(' · ')}
                </dd>
              </>
            )}
            <dt className="font-bold">Masuk</dt>
            <dd>{formatDateTime(order.created_at)}</dd>
            <dt className="font-bold">Jadwal</dt>
            <dd className={order.scheduled_date ? 'font-bold' : undefined}>
              {formatSchedule(order.scheduled_date, order.scheduled_slot)}
            </dd>
            {order.notes && (
              <>
                <dt className="font-bold">Catatan</dt>
                <dd className="line-clamp-2">{order.notes}</dd>
              </>
            )}
          </dl>
        </footer>
      </div>

      {/* ── Scissors line ── */}
      <div className="relative mx-[2mm] flex h-[3mm] shrink-0 items-center" aria-hidden>
        <span className="w-full border-t border-dashed border-black" />
        <span className="absolute left-[2mm] bg-white px-[1mm] text-[10pt] leading-none">✂</span>
        <span className="absolute right-[3mm] bg-white px-[1mm] text-[6pt] tracking-widest uppercase">gunting di sini</span>
      </div>

      {/* ── Bottom ¼: stub for whoever placed the order ── */}
      <div className="flex min-h-0 flex-1 items-center gap-[3mm] px-[4mm] pb-[2.5mm] pt-[1mm]">
        <div className="min-w-0 flex-1">
          <p className="text-[6.5pt] font-bold tracking-widest uppercase">Bukti pesanan · {org?.name ?? 'MedSend'}</p>
          <p className="font-mono text-[12pt] leading-tight font-bold tracking-wider">{order.code}</p>
          <p className="truncate font-semibold">
            {patient ? `Pasien ${patient}` : stubOrder.customer_name}
          </p>
          <p className="truncate text-[8pt]">
            {order.service?.name ?? '—'} · {order.is_free ? 'Gratis' : formatRupiah(order.price)}
            {payment && <b> · {PAYMENT_STATUS_LABELS[payment]}</b>}
          </p>
          <p className="mt-[0.5mm] text-[6.5pt] leading-tight">Scan QR untuk melacak pesanan, atau buka {window.location.host}/lacak</p>
        </div>
        {qr && <img src={qr} alt="" className="size-[27mm] shrink-0 [image-rendering:pixelated]" />}
      </div>
    </article>
  );
}
