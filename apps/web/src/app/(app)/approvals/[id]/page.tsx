import { ApprovalDetailScreen } from '@/modules/approvals/components/approval-detail-screen';

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApprovalDetailScreen id={id} />;
}
