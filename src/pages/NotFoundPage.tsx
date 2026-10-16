import { ArrowLeftIcon, LayoutDashboardIcon, MapPinOffIcon, PackageSearchIcon, PillIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

/** Catch-all for URLs that match no route. Staff get admin links, everyone else the public pages. */
export default function NotFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Only offer "Kembali" when there is a page in this tab to go back to.
  const canGoBack = window.history.state?.idx > 0;

  return (
    <Card className="mx-auto max-w-lg overflow-hidden py-0">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
        <div className="relative mb-6">
          <span className="bg-linear-to-br from-primary to-brand-blue bg-clip-text text-7xl font-extrabold tracking-tight text-transparent tabular-nums sm:text-8xl">
            404
          </span>
          <span className="absolute -top-2 -right-6 grid size-11 place-items-center rounded-full border-4 border-card bg-brand-orange text-white shadow-md">
            <MapPinOffIcon className="size-5" />
          </span>
        </div>

        <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Alamat{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all text-foreground">{pathname}</code>{' '}
          tidak ada. Mungkin salah ketik, atau tautannya sudah tidak berlaku.
        </p>

        <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
          {user ? (
            <>
              <Button asChild>
                <Link to="/">
                  <LayoutDashboardIcon />
                  Ke dasbor
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/orders">
                  <PackageSearchIcon />
                  Daftar pesanan
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link to="/order">
                  <PillIcon />
                  Pesan antar obat
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/lacak">
                  <PackageSearchIcon />
                  Lacak order
                </Link>
              </Button>
            </>
          )}
        </div>

        {canGoBack && (
          <Button variant="link" size="sm" className="mt-3 text-muted-foreground" onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
            Kembali ke halaman sebelumnya
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
