import { CalendarDaysIcon, ChevronDownIcon, PlayCircleIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import { cn } from '@/lib/utils';
import { CHANGELOG, type ChangelogEntry } from '@/pages/public/changelog-entries';

const dateLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', opts);

// Entries grouped by the date they were finished, newest first.
const RELEASES = [...new Set(CHANGELOG.map((e) => e.date))]
  .sort((a, b) => b.localeCompare(a))
  .map((date) => ({ date, entries: CHANGELOG.filter((e) => e.date === date).sort((a, b) => a.no - b.no) }));

/** One request, collapsed to its title; opening it shows the details and the video. */
function Entry({ entry }: { entry: ChangelogEntry }) {
  const src = `/changelog-media/${entry.video}.mp4${entry.videoStart ? `#t=${entry.videoStart}` : ''}`;
  return (
    <details className="group rounded-xl border bg-card shadow-xs open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {entry.no}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">{entry.title}</span>
          {entry.video && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <PlayCircleIcon className="size-3.5" />
              Ada video
            </span>
          )}
        </span>
        <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t px-4 pt-4 pb-5 animate-in fade-in slide-in-from-top-1 duration-200 sm:px-5">
        <p className="text-sm text-muted-foreground">{entry.summary}</p>
        <ul className="list-disc space-y-1 ps-5 text-sm">
          {entry.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {entry.video && (
          // preload="none": nothing downloads until play.
          <video
            controls
            playsInline
            preload="none"
            poster={`/changelog-media/${entry.poster ?? entry.video}.jpg`}
            src={src}
            className="aspect-video w-full rounded-lg border bg-black"
          />
        )}
      </div>
    </details>
  );
}

/**
 * /changelog — the RS's requests and what was built, with demo videos: dates on
 * the left, the chosen date's requests on the right (?tanggal= keeps it in the
 * link). No login, so the link can be shared.
 */
export default function ChangelogPage() {
  const [params, setParams] = useSearchParams();
  const release = RELEASES.find((r) => r.date === params.get('tanggal')) ?? RELEASES[0];

  // Opening an entry can make the page scroll; keep the scrollbar's room reserved
  // so the centred page doesn't jump sideways when the scrollbar appears.
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollbarGutter = 'stable';
    return () => {
      html.style.scrollbarGutter = '';
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-widest text-brand-orange uppercase">Changelog</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Catatan pembaruan</h1>
        <p className="text-sm text-muted-foreground">
          Fitur yang diminta RS dan sudah selesai. Pilih tanggal, lalu klik salah satu untuk melihat detail dan videonya.
        </p>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[15rem_1fr]">
        <nav aria-label="Tanggal pembaruan" className="rounded-xl border bg-card p-2 md:sticky md:top-4">
          <p className="px-2 pt-1 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tanggal</p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {RELEASES.map((r) => {
              const active = r.date === release.date;
              return (
                <li key={r.date}>
                  <button
                    type="button"
                    onClick={() => setParams({ tanggal: r.date }, { replace: true })}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    <CalendarDaysIcon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{dateLabel(r.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span className={cn('block text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {r.entries.length} pembaruan
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="space-y-3 rounded-xl border bg-card/50 p-3 sm:p-4">
          <h2 className="px-1 font-semibold">
            {dateLabel(release.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          {release.entries.map((entry) => (
            <Entry key={entry.no} entry={entry} />
          ))}
        </section>
      </div>
    </div>
  );
}
