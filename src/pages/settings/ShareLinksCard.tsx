import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MonitorSmartphoneIcon,
  PackageSearchIcon,
  PillIcon,
  PrinterIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

/** Links are built from wherever this panel runs, so each install shows its own domain. */
const origin = () => window.location.origin;

function useQr(url: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 640, margin: 1, color: { dark: '#18186C' } }).then((d) => alive && setDataUrl(d));
    return () => {
      alive = false;
    };
  }, [url]);
  return dataUrl;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the link is selectable in the box.
        }
      }}
    >
      {copied ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
      {copied ? 'Tersalin' : 'Salin'}
    </Button>
  );
}

function LinkRow({
  icon: Icon,
  title,
  hint,
  url,
  extra,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: ReactNode;
  url: string;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:pl-12">
        <Input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-56 flex-1 font-mono text-sm" />
        <CopyButton text={url} />
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
            Buka
          </a>
        </Button>
        {extra}
      </div>
    </div>
  );
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A4 poster (QR + how to order) in a new window, printed straight away. */
function printPoster(rsName: string, url: string, qr: string) {
  const w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) return;
  const name = escapeHtml(rsName);
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Poster order — ${name}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #0f172a; text-align: center; }
  .brand { color: #18186C; font-weight: 800; font-size: 22px; letter-spacing: .5px; }
  h1 { font-size: 46px; line-height: 1.1; margin: 28px 0 10px; }
  .sub { font-size: 22px; color: #475569; margin: 0 0 28px; }
  img { width: 92mm; height: 92mm; border: 6px solid #18186C; border-radius: 18px; padding: 6px; }
  .url { font-family: ui-monospace, Menlo, monospace; font-size: 20px; margin-top: 14px; color: #18186C; }
  ol { text-align: left; display: inline-block; font-size: 20px; line-height: 1.7; margin: 30px 0 0; padding-left: 26px; }
  .foot { margin-top: 34px; font-size: 15px; color: #64748b; }
</style></head><body>
  <div class="brand">${name}</div>
  <h1>Pesan Antar Obat<br>ke Rumah</h1>
  <p class="sub">Tidak perlu menunggu di apotek — obat diantar kurir.</p>
  <img src="${qr}" alt="QR form order">
  <div class="url">${escapeHtml(url)}</div>
  <ol>
    <li>Scan QR di atas dengan kamera HP</li>
    <li>Isi data pasien &amp; alamat pengiriman</li>
    <li>Pilih layanan &amp; cara bayar, lalu kirim pesanan</li>
  </ol>
  <div class="foot">Simpan kode pesanan untuk melacak status pengiriman.</div>
  <script>window.onload = () => { window.focus(); window.print(); };</script>
</body></html>`);
  w.document.close();
}

/**
 * Pengaturan → Profil RS: the public links to hand out (order form for
 * patients' phones, the counter kiosk, order tracking), with a QR code and a
 * printable poster for the order form.
 */
export default function ShareLinksCard({ rsName }: { rsName: string }) {
  const orderUrl = `${origin()}/order`;
  const kioskUrl = `${origin()}/kios`;
  const trackUrl = `${origin()}/lacak`;
  const qr = useQr(orderUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Link & QR</CardTitle>
        <CardDescription>Link publik untuk dibagikan ke pasien atau dipasang di perangkat RS.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="flex flex-col gap-4 pb-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <LinkRow
              icon={PillIcon}
              title="Form order (pasien)"
              hint="Pasien pesan antar obat dari HP sendiri. Bagikan lewat WhatsApp, website RS, atau poster."
              url={orderUrl}
            />
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2">
            {qr ? (
              <img src={qr} alt="QR code form order" className="size-36 rounded-lg border bg-white p-1" />
            ) : (
              <div className="size-36 animate-pulse rounded-lg bg-muted" />
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={!qr} onClick={() => qr && printPoster(rsName, orderUrl, qr)}>
                <PrinterIcon />
                Poster
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!qr} asChild>
                <a href={qr ?? undefined} download="qr-form-order.png" aria-label="Unduh QR (PNG)">
                  <DownloadIcon />
                  PNG
                </a>
              </Button>
            </div>
          </div>
        </div>
        <LinkRow
          icon={MonitorSmartphoneIcon}
          title="Kios (layar sentuh di loket)"
          hint={
            <>
              Buka sekali di perangkat kios, jadikan <b>halaman awal</b> browser, lalu tampilkan layar penuh (F11).
            </>
          }
          url={kioskUrl}
        />
        <LinkRow
          icon={PackageSearchIcon}
          title="Lacak pesanan"
          hint="Pasien cek status pesanan pakai kode order. Sudah otomatis ada di form order & halaman sukses."
          url={trackUrl}
        />
      </CardContent>
    </Card>
  );
}
