import { AgentRunDetailScreen } from '@/modules/ai/components/agent-run-detail-screen';

export default async function AiRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentRunDetailScreen id={id} />;
}
