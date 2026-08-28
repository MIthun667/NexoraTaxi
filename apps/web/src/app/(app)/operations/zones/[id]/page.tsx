import { DispatchZoneDetailScreen } from '@/modules/dispatch/components/dispatch-zone-detail-screen';

export default async function OperationsZoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DispatchZoneDetailScreen id={id} />;
}
