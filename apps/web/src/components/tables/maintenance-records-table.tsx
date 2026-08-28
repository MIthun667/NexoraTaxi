import { DataTable } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FleetMaintenanceRecord } from '@/types/entities';
import { formatDate } from '@/lib/utils';

export function MaintenanceRecordsTable({ items }: { items: FleetMaintenanceRecord[] }) {
  return (
    <DataTable
      data={items}
      rowKey={(row) => row.id}
      columns={[
        { key: 'title', title: 'Record', sortable: true, render: (row) => <div><p className="font-medium text-white">{row.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{row.maintenanceType}</p></div> },
        { key: 'vendorName', title: 'Vendor', render: (row) => row.vendorName ?? '-' },
        { key: 'scheduledAt', title: 'Scheduled', render: (row) => (row.scheduledAt ? formatDate(row.scheduledAt) : '-') },
        { key: 'completedAt', title: 'Completed', render: (row) => (row.completedAt ? formatDate(row.completedAt) : '-') },
        { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
      ]}
    />
  );
}
