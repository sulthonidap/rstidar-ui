import { zodResolver } from '@hookform/resolvers/zod';
import {
  ClockAlertIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
  SmartphoneIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetupStatus } from '@/features/setup/queries';
import { useAuth } from '@/lib/auth';
import { canVisit } from '@/lib/roles';
import { nextPath } from '@/lib/session';

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

/**
 * A Google Drive share link ("…/file/d/<id>/view") becomes a direct download.
 * confirm=t skips the "can't scan for viruses" page Drive puts before big files.
 */
function directDownloadUrl(url: string): string {
  const id =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1] ?? url.match(/drive\.google\.com\/.*[?&]id=([\w-]+)/)?.[1];
  return id ? `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t` : url;
}

// Courier Android app. Set VITE_APK_URL to wherever the APK is hosted (Google Drive share
// link, R2, GitHub Releases, …); without it we fall back to a file dropped in public/.
const APK_URL = directDownloadUrl(import.meta.env.VITE_APK_URL || '/medsend-kurir.apk');
const APK_META = [
  import.meta.env.VITE_APK_VERSION && `Versi ${import.meta.env.VITE_APK_VERSION}`,
  import.meta.env.VITE_APK_SIZE,
]
  .filter(Boolean)
  .join(' · ');

/** QR of the APK link, so a courier can scan it from the screen with their phone. */
function useApkQr() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const url = new URL(APK_URL, window.location.origin).href;
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#18186C' } }).then((d) => alive && setDataUrl(d));
    return () => {
      alive = false;
    };
  }, []);
  return dataUrl;
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-primary">Med</span>
      <span className="text-brand-orange">Send</span>
    </span>
  );
}

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const license = useSetupStatus().data?.license;
  const navigate = useNavigate();
  const { search } = useLocation();
  // Back to the page they were on (see lib/session); ?expired=1 = their session ran out.
  const next = nextPath(search);
  const expired = new URLSearchParams(search).get('expired') === '1';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const apkQr = useApkQr();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (!isLoading && user) {
    return <Navigate to={canVisit(user, next) ? next : '/'} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const loggedIn = await login(values.email, values.password);
      // A page this role can't open (e.g. a link left by another account) goes to the Dashboard.
      navigate(canVisit(loggedIn, next) ? next : '/', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login gagal');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-primary to-brand-blue p-12 text-primary-foreground lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-brand-orange/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5">
          <div className="flex size-28 items-center justify-center rounded-3xl bg-white p-4 shadow-2xl">
            <img src="/logo.png" alt="" className="size-full object-contain" />
          </div>
          <span className="text-5xl font-extrabold tracking-tight">MedSend</span>

          <a
            href={APK_URL}
            download
            className="group mt-6 flex w-80 items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/15"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-orange text-white">
              <SmartphoneIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Download Aplikasi Kurir</span>
              <span className="block text-xs text-primary-foreground/70">
                Android{APK_META && <> · {APK_META}</>}
              </span>
            </span>
            <DownloadIcon className="size-4 shrink-0 text-primary-foreground/70 transition-colors group-hover:text-primary-foreground" />
          </a>
          {apkQr && (
            <div className="flex w-80 items-center gap-4 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
              <img src={apkQr} alt="QR download aplikasi kurir" className="size-24 shrink-0 rounded-lg bg-white p-1.5" />
              <p className="text-sm text-primary-foreground/80">
                <span className="block font-semibold text-primary-foreground">Scan dari HP kurir</span>
                Buka kamera HP, arahkan ke QR, lalu ketuk link untuk download.
              </p>
            </div>
          )}
          <p className="text-xs text-primary-foreground/60">
            Jika diminta, izinkan instalasi dari sumber tidak dikenal.
          </p>
        </div>

        <p className="absolute bottom-12 left-12 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} MedSend
        </p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center bg-muted/40 px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="" className="size-14 object-contain" />
            <Wordmark className="text-3xl font-extrabold tracking-tight" />
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {expired && !serverError && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <ClockAlertIcon />
                <AlertTitle>Sesi kamu berakhir</AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  Silakan masuk lagi{next !== '/' ? ', lalu kamu dibawa kembali ke halaman tadi' : ''}.
                </AlertDescription>
              </Alert>
            )}
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@medsend.test"
                  className="h-11 bg-background pl-10"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 bg-background px-10"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircleIcon className="animate-spin" />
                  Memproses…
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Mau kirim barang?{' '}
            <Link to="/order" className="font-semibold text-primary hover:underline">
              Buat order
            </Link>
            <span className="mx-1.5">·</span>
            <Link to="/lacak" className="font-semibold text-primary hover:underline">
              Lacak order
            </Link>
          </p>

          {/* On a phone the brand panel is hidden: couriers download the app from here. */}
          <a
            href={APK_URL}
            className="flex items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted lg:hidden"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-orange text-white">
              <SmartphoneIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Download Aplikasi Kurir</span>
              <span className="block text-xs text-muted-foreground">
                Android{APK_META && <> · {APK_META}</>} · izinkan instalasi dari sumber tidak dikenal
              </span>
            </span>
            <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
          </a>

          {license && (
            <p className="text-center text-xs text-muted-foreground">
              Dilisensikan untuk {license.rs} · {license.no}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
