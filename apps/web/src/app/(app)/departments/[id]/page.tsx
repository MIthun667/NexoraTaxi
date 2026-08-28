import { DepartmentDetailScreen } from '@/modules/platform/components/department-detail-screen';

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DepartmentDetailScreen id={id} />;
}
