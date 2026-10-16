import { cn } from '@/lib/utils';

/**
 * The app's loading indicator (three-dot pulse). By default the dots sit dead
 * center of the screen wherever it's used (page, table, card), while an empty
 * block keeps the space so the layout doesn't jump when data arrives.
 * `compact` renders just the dots inline (e.g. next to text).
 * `size` scales the dots (1 = 16px); `label` is read by screen readers only.
 */
export default function Loader({
  size = 1,
  label = 'Memuat…',
  compact = false,
  className,
}: {
  size?: number;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const dots = <span className="loader" style={{ '--size': `${size}px` } as React.CSSProperties} aria-hidden="true" />;

  if (compact) {
    return (
      <div role="status" className={cn('inline-flex items-center justify-center', className)}>
        {dots}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div role="status" className={cn('min-h-[40vh] w-full', className)}>
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">{dots}</div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
