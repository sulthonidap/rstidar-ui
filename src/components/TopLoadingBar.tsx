import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Thin progress bar pinned to the top of the viewport (NProgress-style).
 * Runs while any React Query request is in flight: creeps toward 90%,
 * then jumps to 100% and fades out once everything has settled.
 */
export function TopLoadingBar() {
  const active = useIsFetching() + useIsMutating() > 0;
  const [progress, setProgress] = useState(0);
  const [prevActive, setPrevActive] = useState(active);

  // Kick off (10%) or finish (100%) as soon as the loading state flips.
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setProgress((p) => (p === 0 || p === 100 ? 10 : p));
    else setProgress((p) => (p === 0 ? 0 : 100));
  }

  useEffect(() => {
    if (active) {
      const id = setInterval(() => setProgress((p) => p + (90 - p) * 0.1), 200);
      return () => clearInterval(id);
    }

    const id = setTimeout(() => setProgress(0), 600);
    return () => clearTimeout(id);
  }, [active]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-100 h-[3px] bg-linear-to-r from-brand-orange to-brand-blue shadow-[0_0_8px_var(--brand-orange)]"
      style={{
        width: `${progress}%`,
        opacity: active ? 1 : 0,
        transition: progress === 0 ? 'none' : 'width 200ms ease-out, opacity 300ms ease 250ms',
      }}
    />
  );
}
