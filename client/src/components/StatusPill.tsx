import type { QueueStatus } from '../types';

const labels: Record<QueueStatus, string> = {
  WAITING: 'Waiting',
  SERVING: 'Now serving',
  DONE: 'Completed',
  NO_SHOW: 'No-show',
};

export function StatusPill({ status }: { status: QueueStatus }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{labels[status]}</span>;
}
