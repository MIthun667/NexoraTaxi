import Link from 'next/link';
import { Building2, KeyRound, ScrollText } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage organizations, access boundaries, and review surfaces for Nexora Commerce."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard eyebrow="Organizations" title="Connected organizations">
          <p className="text-sm text-slate-300">
            Review organization-level configuration, store ownership, and tenancy boundaries.
          </p>
          <Link href="/settings/organizations" className="mt-4 inline-flex">
            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              Open Organizations
            </Button>
          </Link>
        </SectionCard>

        <SectionCard eyebrow="Access" title="Access & roles">
          <p className="text-sm text-slate-300">
            Manage users, roles, and permission visibility without exposing internal modules in the primary product surface.
          </p>
          <Link href="/settings/access" className="mt-4 inline-flex">
            <Button variant="outline">
              <KeyRound className="mr-2 h-4 w-4" />
              Open Access
            </Button>
          </Link>
        </SectionCard>

        <SectionCard eyebrow="Audit" title="Audit & activity">
          <p className="text-sm text-slate-300">
            Inspect the review surfaces that support trustworthy actions and controlled decisions.
          </p>
          <Link href="/settings/audit-activity" className="mt-4 inline-flex">
            <Button variant="outline">
              <ScrollText className="mr-2 h-4 w-4" />
              Open Audit & Activity
            </Button>
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
