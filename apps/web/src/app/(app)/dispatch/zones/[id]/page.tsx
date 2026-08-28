import { redirect } from 'next/navigation';

export default async function DispatchZoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operations/zones/${id}`);
}
