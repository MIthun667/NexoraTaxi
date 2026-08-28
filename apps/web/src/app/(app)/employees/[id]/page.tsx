import { EmployeeDetailScreen } from '@/modules/platform/components/employee-detail-screen';

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeDetailScreen id={id} />;
}
