import { EyeIcon, EyeOffIcon, LoaderCircleIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Eye toggle next to masked patient data (see useReveal). Each opening is logged by the API. */
export default function RevealButton({
  shown,
  loading,
  onClick,
}: {
  shown: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const label = shown ? 'Sembunyikan data pasien' : 'Lihat data pasien';
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 shrink-0 text-muted-foreground"
      disabled={loading}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {loading ? <LoaderCircleIcon className="animate-spin" /> : shown ? <EyeOffIcon /> : <EyeIcon />}
    </Button>
  );
}
