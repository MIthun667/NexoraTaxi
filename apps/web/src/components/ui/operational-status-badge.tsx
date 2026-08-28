import { StatusBadge } from '@/components/ui/status-badge';

export function OperationalStatusBadge({ value }: { value: string }) {
  return <StatusBadge value={value} />;
}
