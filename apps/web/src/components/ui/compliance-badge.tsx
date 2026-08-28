import { StatusBadge } from '@/components/ui/status-badge';

export function ComplianceBadge({ value }: { value: string }) {
  return <StatusBadge value={value} />;
}
