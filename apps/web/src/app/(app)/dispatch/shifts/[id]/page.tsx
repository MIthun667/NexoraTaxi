import { redirect } from 'next/navigation';

export default async function DispatchShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operations/shifts/${id}`);
}
