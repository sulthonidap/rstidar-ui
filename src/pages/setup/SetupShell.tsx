import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const STEPS = ['Lisensi', 'Akun admin', 'Profil RS'];

/** Frame of the first-run screens: logo, the 3 setup steps, and the step's card. */
export default function SetupShell({
  step,
  title,
  description,
  wide,
  children,
}: {
  step: 1 | 2 | 3;
  /** Wider card, for the RS profile form with its map. */
  wide?: boolean;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className={cn('w-full space-y-6', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="" className="size-14 object-contain" />
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="text-primary">Med</span>
            <span className="text-brand-orange">Send</span>
          </span>
        </div>

        <ol className="flex items-center justify-center gap-2 text-xs" aria-label="Langkah setup">
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <li key={label} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 bg-border" />}
                <span
                  className={cn(
                    'flex items-center gap-1.5',
                    n === step ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                  aria-current={n === step ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border text-[11px]',
                      n < step && 'border-primary bg-primary text-primary-foreground',
                      n === step && 'border-primary text-primary',
                    )}
                  >
                    {n}
                  </span>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="space-y-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
