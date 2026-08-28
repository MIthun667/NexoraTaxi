import { DispatchShiftDetailScreen } from '@/modules/dispatch/components/dispatch-shift-detail-screen';

export default async function OperationsShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DispatchShiftDetailScreen id={id} />;
}
