import { LoaderCircleIcon, SearchIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { useCustomers } from '@/features/customers/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/models';

/**
 * Type a name or phone number, pick a saved customer from the suggestions
 * (mouse or ↑/↓ + Enter).
 */
export default function CustomerPicker({
  invalid,
  onPick,
}: {
  invalid?: boolean;
  onPick: (customer: Customer) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const search = useDebouncedValue(query.trim(), 250);

  const { data, isFetching } = useCustomers(
    { search, page: 1, perPage: 8 },
    { enabled: open },
  );
  const results = data?.data ?? [];

  const pick = (customer: Customer) => {
    onPick(customer);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (results.length) {
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setHighlight((h) => (h + step + results.length) % results.length);
      }
    } else if (e.key === 'Enter' && open && results[highlight]) {
      e.preventDefault(); // don't submit the order form
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="customer_search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        autoComplete="off"
        className="pl-9"
        placeholder="Ketik nama atau nomor HP customer…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Delay so a click on a suggestion lands before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {isFetching && open && (
        <LoaderCircleIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              {isFetching ? 'Mencari…' : search ? 'Nggak ketemu. Pakai "Customer baru".' : 'Belum ada customer tersimpan.'}
            </li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === highlight}
                className={cn(
                  'cursor-pointer rounded-sm px-3 py-2',
                  i === highlight ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.phone}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.address}</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
