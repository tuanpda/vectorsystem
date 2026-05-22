import { DOC_STATUS_LABELS } from '../lib/vi';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status}`}>
      {DOC_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
    </span>
  );
}
