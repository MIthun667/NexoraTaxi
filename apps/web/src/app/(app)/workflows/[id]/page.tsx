import { WorkflowDetailScreen } from '@/modules/workflows/components/workflow-detail-screen';

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkflowDetailScreen id={id} />;
}
