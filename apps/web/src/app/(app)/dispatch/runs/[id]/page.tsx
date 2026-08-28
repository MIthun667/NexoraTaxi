import { redirect } from 'next/navigation';

export default async function DispatchRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operations/runs/${id}`);
}
