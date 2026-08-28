import { FleetVehicleDetailScreen } from '@/modules/fleet/components/fleet-vehicle-detail-screen';

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FleetVehicleDetailScreen id={id} />;
}
