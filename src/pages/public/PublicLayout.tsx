import { PackageSearchIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';

/**
 * Shell for the no-login pages (order form, success, tracking); `wide` for
 * two-column pages (changelog), `trackLink={false}` drops "Lacak order" (a page not meant for patients).
 */
export default function PublicLayout({ wide, trackLink = true }: { wide?: boolean; trackLink?: boolean }) {
  const width = wide ? 'max-w-6xl' : 'max-w-3xl';
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="border-b-2 border-brand-orange bg-linear-to-r from-primary to-brand-blue text-primary-foreground">
        <div className={`mx-auto flex h-16 ${width} items-center justify-between gap-4 px-4`}>
          <span className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white p-1">
              <img src="/logo.png" alt="" className="size-full object-contain" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">MedSend</span>
          </span>
          {trackLink && (
            <Link
              to="/lacak"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-white/15"
            >
              <PackageSearchIcon className="size-4" />
              Lacak order
            </Link>
          )}
        </div>
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-4 py-8 sm:py-10`}>
        <Outlet />
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MedSend</footer>
    </div>
  );
}
