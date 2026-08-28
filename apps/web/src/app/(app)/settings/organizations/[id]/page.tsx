import { OrganizationDetailScreen } from '@/modules/platform/components/organization-detail-screen';

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrganizationDetailScreen id={id} />;
}
