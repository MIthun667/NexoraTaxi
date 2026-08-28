import { DispatchIncidentDetailScreen } from '@/modules/dispatch/components/dispatch-incident-detail-screen';

export default async function OperationsIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DispatchIncidentDetailScreen id={id} />;
}
