import { redirect } from 'next/navigation';

export default async function DispatchAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operations/assignments/${id}`);
}
