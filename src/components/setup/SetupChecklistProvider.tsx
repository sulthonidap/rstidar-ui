import { CircleCheckIcon, CircleIcon, ListChecksIcon, LogOutIcon, PartyPopperIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSetupChecklist } from '@/features/setup/queries';
import { useAuth } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { cn } from '@/lib/utils';

import { buildChecklist, SetupChecklistContext, type ChecklistItem, type SetupChecklistValue } from './context';

// Set while this browser has seen the checklist incomplete; the "siap dipakai" message shows once when it clears.
const PENDING_KEY = 'medsend_setup_pending';
// Pages where the steps are done: the checklist steps aside there instead of blocking the form.
const SETUP_PATHS = ['/services', '/users', '/pengaturan/pembayaran'];

function onSetupPage(pathname: string) {
  return SETUP_PATHS.some((p) => pathname.startsWith(p));
}

function readPending(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

function writePending(on: boolean) {
  try {
    if (on) localStorage.setItem(PENDING_KEY, '1');
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: only the one-time "siap dipakai" message is lost.
  }
}

/**
 * First-run checklist for the admin: services and one active account per
 * staff role (required), non-cash payment (optional). Until the required steps
 * are done it can't be dismissed: it blocks every page except the setup pages
 * (Tipe Layanan, Kelola User, Pembayaran), where it steps aside so the admin
 * can fill the form, and comes back after each finished step.
 */
export default function SetupChecklistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = hasRole(user, 'admin');
  const { data } = useSetupChecklist(isAdmin);
  const { pathname } = useLocation();
  // Stepped aside for the setup page the admin went to.
  const [aside, setAside] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const value = useMemo<SetupChecklistValue>(() => {
    const items = data ? buildChecklist(data) : [];
    const required = items.filter((i) => i.required);
    const requiredDone = required.filter((i) => i.done).length;
    return {
      enabled: isAdmin && !!data,
      items,
      requiredDone,
      requiredTotal: required.length,
      complete: !!data && requiredDone === required.length,
      openChecklist: () => setAside(false),
    };
  }, [data, isAdmin]);

  // Back in front when leaving the setup pages, or after a step is done (to show the next one).
  const [seen, setSeen] = useState({ pathname, done: value.requiredDone });
  if (seen.pathname !== pathname || seen.done !== value.requiredDone) {
    setSeen({ pathname, done: value.requiredDone });
    if (!onSetupPage(pathname) || value.requiredDone > seen.done) setAside(false);
  }

  useEffect(() => {
    if (!value.enabled) return;
    if (!value.complete) writePending(true);
    else if (readPending()) {
      writePending(false);
      setCelebrate(true);
    }
  }, [value.enabled, value.complete]);

  const blocking = value.enabled && !value.complete && !aside;

  return (
    <SetupChecklistContext.Provider value={value}>
      {children}
      {value.enabled && (
        <ChecklistDialog
          open={blocking || celebrate}
          dismissible={value.complete}
          onClose={() => setCelebrate(false)}
          onGo={() => setAside(true)}
          items={value.items}
          requiredDone={value.requiredDone}
          requiredTotal={value.requiredTotal}
          complete={value.complete}
        />
      )}
    </SetupChecklistContext.Provider>
  );
}

function ChecklistDialog({
  open,
  dismissible,
  onClose,
  onGo,
  items,
  requiredDone,
  requiredTotal,
  complete,
}: {
  open: boolean;
  /** Only the final "siap dipakai" message can be closed. */
  dismissible: boolean;
  onClose: () => void;
  onGo: () => void;
  items: ChecklistItem[];
  requiredDone: number;
  requiredTotal: number;
  complete: boolean;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const next = items.find((i) => i.required && !i.done);
  const required = items.filter((i) => i.required);
  const optional = items.filter((i) => !i.required);
  const block = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismissible && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={dismissible}
        onEscapeKeyDown={block}
        onInteractOutside={block}
      >
        <DialogHeader className="gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {complete ? <PartyPopperIcon className="size-6 text-brand-orange" /> : <ListChecksIcon className="size-6" />}
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {complete ? 'MedSend siap dipakai' : 'Siapkan MedSend'}
          </DialogTitle>
          <DialogDescription>
            {complete
              ? 'Semua langkah wajib sudah selesai. Order sudah bisa diproses dari Farmasi sampai ke kurir.'
              : 'Lengkapi langkah wajib berikut sebelum mulai memakai panel, supaya order bisa diproses dari Farmasi sampai ke kurir.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Langkah wajib</span>
            <span className="font-medium text-foreground">
              {requiredDone}/{requiredTotal} selesai
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(requiredDone / requiredTotal) * 100}%` }}
            />
          </div>
        </div>

        <ul className="-mx-2 space-y-0.5">
          {required.map((item) => (
            <ChecklistRow key={item.key} item={item} onGo={onGo} />
          ))}
        </ul>
        <div className="space-y-0.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Opsional</p>
          <ul className="-mx-2">
            {optional.map((item) => (
              <ChecklistRow key={item.key} item={item} onGo={onGo} />
            ))}
          </ul>
        </div>

        <DialogFooter className="sm:justify-between">
          {complete ? (
            <Button className="sm:ml-auto" onClick={onClose}>
              Mulai pakai MedSend
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="text-muted-foreground" onClick={logout}>
                <LogOutIcon />
                Keluar
              </Button>
              {next && (
                <Button
                  onClick={() => {
                    onGo();
                    navigate(next.to);
                  }}
                >
                  Lanjut: {next.label}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistRow({ item, onGo }: { item: ChecklistItem; onGo: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
      {item.done ? (
        <CircleCheckIcon className="size-5 shrink-0 text-emerald-600" />
      ) : (
        <CircleIcon className="size-5 shrink-0 text-muted-foreground/50" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', item.done && 'text-muted-foreground')}>{item.label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.hint} · <span className={cn(item.done && 'text-emerald-700')}>{item.status}</span>
        </p>
      </div>
      <Button asChild variant={item.done ? 'ghost' : 'outline'} size="sm" onClick={onGo}>
        <Link to={item.to}>{item.done ? 'Lihat' : item.key === 'payment' ? 'Atur' : 'Tambah'}</Link>
      </Button>
    </li>
  );
}
