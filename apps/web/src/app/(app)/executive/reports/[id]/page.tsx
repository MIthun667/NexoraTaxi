import { ExecutiveReportScreen } from '@/modules/executive/components/executive-report-screen';

export default async function ExecutiveReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExecutiveReportScreen id={id} />;
}
