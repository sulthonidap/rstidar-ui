import { ArrowBigUpIcon, CornerDownLeftIcon, DeleteIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type Field = HTMLInputElement | HTMLTextAreaElement;

const TEXT_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '/'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ','],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '@'],
];
const NUMBER_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['+', '0'],
];

const isField = (el: Element | null): el is Field =>
  (el instanceof HTMLInputElement && ['text', 'search', 'tel', 'email', ''].includes(el.type)) ||
  el instanceof HTMLTextAreaElement;

/**
 * Types into a React-controlled input: set the value through the native setter
 * and fire "input", the same as a real keystroke, so React's onChange runs.
 */
function typeInto(el: Field, next: string, caret: number) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    // type="tel"/"email" don't support selection ranges; the caret stays at the end.
  }
}

/**
 * On-screen keyboard for a touch kiosk with no physical keyboard. It types into
 * whichever text field was touched last — the kiosk's own fields and the map's
 * address search alike — and switches to a number pad for phone fields
 * (inputMode tel/numeric). Keys never take the focus away from the field.
 * Only on big (lg+) screens: phones and tablets show their own keyboard.
 */
export default function KioskKeyboard({ className }: { className?: string }) {
  const [target, setTarget] = useState<Field | null>(null);
  const [shift, setShift] = useState(false);

  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      if (isField(e.target as Element)) setTarget(e.target as Field);
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);

  const numeric = target?.inputMode === 'tel' || target?.inputMode === 'numeric';

  const insert = (text: string) => {
    if (!target || !target.isConnected) return;
    target.focus();
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    typeInto(target, target.value.slice(0, start) + text + target.value.slice(end), start + text.length);
    if (shift) setShift(false);
  };
  const backspace = () => {
    if (!target || !target.isConnected) return;
    target.focus();
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    if (start === end && start === 0) return;
    const from = start === end ? start - 1 : start;
    typeInto(target, target.value.slice(0, from) + target.value.slice(end), from);
  };
  const enter = () => {
    if (!target || !target.isConnected) return;
    if (target instanceof HTMLTextAreaElement) return insert('\n');
    // Same as pressing Enter (e.g. runs the map's address search).
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
  };

  // pointerdown + preventDefault: tapping a key keeps the focus (and caret) in the field.
  const keyProps = (onPress: () => void) => ({
    type: 'button' as const,
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onPress();
    },
  });

  const keyClass =
    'flex h-12 min-w-0 flex-1 select-none items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-medium text-slate-800 shadow-[0_2px_0_0] shadow-slate-200 transition active:translate-y-0.5 active:shadow-none';

  if (!target) {
    return (
      <div className={cn('hidden rounded-2xl border border-dashed bg-slate-50 p-4 text-center text-sm text-muted-foreground lg:block', className)}>
        Sentuh salah satu kolom isian untuk mulai mengetik.
      </div>
    );
  }

  return (
    <div className={cn('hidden space-y-2 rounded-2xl border bg-slate-100 p-3 lg:block', className)} aria-label="Keyboard layar">
      {(numeric ? NUMBER_ROWS : TEXT_ROWS).map((row, i) => (
        <div key={i} className={cn('flex gap-1.5', numeric && 'mx-auto max-w-sm')}>
          {row.map((k) => {
            const label = shift ? k.toUpperCase() : k;
            return (
              <button key={k} className={keyClass} {...keyProps(() => insert(label))}>
                {label}
              </button>
            );
          })}
          {/* Backspace: end of the first row on the letters, next to 0 on the number pad. */}
          {i === (numeric ? NUMBER_ROWS.length - 1 : 0) && (
            <button className={cn(keyClass, !numeric && 'flex-[1.4]', 'text-destructive')} aria-label="Hapus" {...keyProps(backspace)}>
              <DeleteIcon className="size-5" />
            </button>
          )}
        </div>
      ))}
      <div className={cn('flex gap-1.5', numeric && 'mx-auto max-w-sm')}>
        {!numeric && (
          <button
            className={cn(keyClass, 'flex-[1.4]', shift && 'border-primary bg-primary text-primary-foreground')}
            aria-label="Huruf besar"
            {...keyProps(() => setShift((s) => !s))}
          >
            <ArrowBigUpIcon className="size-5" />
          </button>
        )}
        {!numeric && (
          <button className={cn(keyClass, 'flex-[5] text-sm text-muted-foreground')} {...keyProps(() => insert(' '))}>
            spasi
          </button>
        )}
        <button className={cn(keyClass, 'flex-[1.6] bg-primary text-primary-foreground shadow-primary/40')} aria-label="Enter" {...keyProps(enter)}>
          <CornerDownLeftIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
