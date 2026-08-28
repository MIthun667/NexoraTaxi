import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed border-white/10 bg-slate-950/40">
      <CardHeader className="mb-2 block">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        This surface is scaffolded and ready for domain-specific modules, filters, actions, and
        workflows.
      </div>
    </Card>
  );
}
