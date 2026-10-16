import { PauseIcon, RotateCcwIcon, TimerIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

/** The kiosk (a shared touch screen at the RS counter), see pages/kiosk. */
export const KIOSK_FORM = '/kios';

/** How long the success page stays before the next patient's empty form. */
const KIOSK_SECONDS = 60;

/**
 * Kiosk mode only: a fixed one-minute countdown (nothing on the page extends
 * it), then an empty order form for the next patient so the previous one's
 * details don't stay on screen. "Tetap di sini" stops it.
 */
export default function KioskCountdown({ onDone }: { /** Default: open the kiosk form. */ onDone?: () => void }) {
  const navigate = useNavigate();
  const done = onDone ?? (() => navigate(KIOSK_FORM, { replace: true }));
  const [left, setLeft] = useState(KIOSK_SECONDS);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, [paused]);

  useEffect(() => {
    if (!paused && left === 0) done();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when it reaches 0
  }, [left, paused]);

  return (
    <div
      role="status"
      className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200"
    >
      <TimerIcon className="size-5 shrink-0" />
      <p className="min-w-0 flex-1">
        {paused ? (
          'Hitung mundur dihentikan.'
        ) : (
          <>
            Kembali ke form order baru dalam <b className="tabular-nums">{left} detik</b>
          </>
        )}
      </p>
      <div className="flex gap-2">
        {!paused && (
          <Button type="button" variant="outline" size="sm" className="bg-background" onClick={() => setPaused(true)}>
            <PauseIcon />
            Tetap di sini
          </Button>
        )}
        <Button type="button" size="sm" onClick={done}>
          <RotateCcwIcon />
          Order baru sekarang
        </Button>
      </div>
    </div>
  );
}
