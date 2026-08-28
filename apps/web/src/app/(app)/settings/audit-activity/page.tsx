import Link from 'next/link';
import { ClipboardCheck, ScrollText } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';

export default function SettingsAuditActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit & Activity"
        title="Audit and activity"
        description="Inspect the current control surfaces that show action review, approval activity, and bounded decision history."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Actions" title="Action review activity">
          <p className="text-sm text-slate-300">
            Review bounded actions, decision history, and the current governed review flow.
          </p>
          <Link href="/shopify/action-proposals" className="mt-4 inline-flex">
            <Button variant="outline">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Open Actions
            </Button>
          </Link>
        </SectionCard>

        <SectionCard eyebrow="Approvals" title="Approval queue">
          <p className="text-sm text-slate-300">
            Inspect approval-step activity for reviewable operational controls already present in the platform.
          </p>
          <Link href="/approvals" className="mt-4 inline-flex">
            <Button variant="outline">
              <ScrollText className="mr-2 h-4 w-4" />
              Open Approval Queue
            </Button>
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
