import { DispatchAssignmentDetailScreen } from '@/modules/dispatch/components/dispatch-assignment-detail-screen';

export default async function OperationsAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DispatchAssignmentDetailScreen id={id} />;
}
