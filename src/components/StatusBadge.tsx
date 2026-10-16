import { STATUS_BADGE } from '@/components/status-colors';
import { Badge } from '@/components/ui/badge';
import type { HistoryStatus } from '@/types/models';
import { ORDER_STATUS_LABELS } from '@/types/models';

export default function StatusBadge({ status }: { status: HistoryStatus }) {
  return (
    <Badge variant="outline" className={`border-transparent ${STATUS_BADGE[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
