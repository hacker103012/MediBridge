import { getStatusLabel } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface Props {
  status: string;
  className?: string;
}

const statusClasses: Record<string, string> = {
  draft:               'badge-draft',
  awaiting_review:     'badge-awaiting_review',
  authorized:          'badge-authorized',
  partially_dispensed: 'badge-partially_dispensed',
  dispensed:           'badge-dispensed',
  cancelled:           'badge-cancelled',
  superseded:          'badge-superseded',
};

export default function StatusBadge({ status, className }: Props) {
  const cls = statusClasses[status] || 'badge-draft';
  return (
    <span className={cn(cls, className)}>
      {getStatusLabel(status)}
    </span>
  );
}
