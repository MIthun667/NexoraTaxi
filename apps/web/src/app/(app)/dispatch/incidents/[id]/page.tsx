import { redirect } from 'next/navigation';

export default async function DispatchIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operations/incidents/${id}`);
}
