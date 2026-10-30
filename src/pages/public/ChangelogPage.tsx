import { CheckCircle2Icon, ChevronDownIcon, PlayCircleIcon } from 'lucide-react';

import { CHANGELOG, type ChangelogEntry } from '@/pages/public/changelog-entries';

const dateLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3.5" />
              Selesai {dateLabel(entry.date)}
            </span>
            {entry.video && (
              <span className="inline-flex items-center gap-1">
                <PlayCircleIcon className="size-3.5" />
                Ada video
              </span>
            )}
          </span>
        </span>
        <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t px-4 pt-4 pb-5 sm:px-5">
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

/** /changelog — the RS's requests and what was built, with demo videos. No login, so the link can be shared. */
export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-widest text-brand-orange uppercase">Changelog</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Catatan pembaruan</h1>
        <p className="text-sm text-muted-foreground">
          Fitur yang diminta RS dan sudah selesai. Klik salah satu untuk melihat detail dan videonya.
        </p>
      </div>

      <div className="space-y-3">
        {CHANGELOG.map((entry) => (
          <Entry key={entry.no} entry={entry} />
        ))}
      </div>
    </div>
  );
}
