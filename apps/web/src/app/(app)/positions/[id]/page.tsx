import { PositionDetailScreen } from '@/modules/platform/components/position-detail-screen';

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PositionDetailScreen id={id} />;
}
