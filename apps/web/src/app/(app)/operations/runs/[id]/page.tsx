import { DispatchRunDetailScreen } from '@/modules/dispatch/components/dispatch-run-detail-screen';

export default async function OperationsRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DispatchRunDetailScreen id={id} />;
}
