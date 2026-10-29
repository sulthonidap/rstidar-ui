import { SparklesIcon, WrenchIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CHANGELOG, type ChangelogItem } from '@/pages/public/changelog-entries';

const dateLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

function Item({ item }: { item: ChangelogItem }) {
  const fix = item.kind === 'perbaikan';
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className={
              fix
                ? 'border-transparent bg-muted text-muted-foreground'
                : 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
            }
          >
            {fix ? <WrenchIcon /> : <SparklesIcon />}
            {fix ? 'Perbaikan' : 'Fitur baru'}
          </Badge>
          <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
          {item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}
        </div>
        {item.points && (
          <ul className="list-disc space-y-1 ps-5 text-sm">
            {item.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {item.video && (
          // preload="none": the poster shows until play, so the page doesn't pull every video.
          <video
            controls
            playsInline
            preload="none"
            poster={`/changelog/${item.video}.jpg`}
            src={`/changelog/${item.video}.mp4`}
            className="aspect-video w-full rounded-lg border bg-black"
          />
        )}
      </CardContent>
    </Card>
  );
}

/** /changelog — what changed in the app, by date, with demo videos. No login, so the link can be shared. */
export default function ChangelogPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-widest text-brand-orange uppercase">Changelog</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Catatan pembaruan</h1>
        <p className="text-sm text-muted-foreground">Perubahan terbaru di aplikasi MedSend, lengkap dengan video contohnya.</p>
      </div>

      {CHANGELOG.map((release) => (
        <section key={release.date} className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <span className="size-2 rounded-full bg-brand-orange" />
            {dateLabel(release.date)}
          </h2>
          {release.items.map((item) => (
            <Item key={item.title} item={item} />
          ))}
        </section>
      ))}
    </div>
  );
}
