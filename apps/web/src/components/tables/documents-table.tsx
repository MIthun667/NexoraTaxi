import { DataTable } from '@/components/tables/data-table';
import { ComplianceBadge } from '@/components/ui/compliance-badge';
import { DriverDocument } from '@/types/entities';
import { formatDate } from '@/lib/utils';

export function DocumentsTable({ items }: { items: DriverDocument[] }) {
  return (
    <DataTable
      data={items}
      rowKey={(row) => row.id}
      columns={[
        { key: 'documentType', title: 'Document Type', sortable: true },
        { key: 'documentNumber', title: 'Document Number', render: (row) => row.documentNumber ?? '-' },
        { key: 'issuedAt', title: 'Issued', render: (row) => (row.issuedAt ? formatDate(row.issuedAt) : '-') },
        { key: 'expiresAt', title: 'Expires', render: (row) => (row.expiresAt ? formatDate(row.expiresAt) : '-') },
        { key: 'verificationStatus', title: 'Verification', render: (row) => <ComplianceBadge value={row.verificationStatus} /> },
      ]}
    />
  );
}
