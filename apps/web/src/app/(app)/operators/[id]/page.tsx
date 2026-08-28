import { DriverDetailScreen } from '@/modules/drivers/components/driver-detail-screen';

export default async function OperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DriverDetailScreen id={id} />;
}
