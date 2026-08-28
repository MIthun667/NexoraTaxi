import Link from 'next/link';
import { KeyRound, ShieldCheck, Users } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';

export default function SettingsAccessPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access & Roles"
        title="Access and roles"
        description="Review how administrators manage user access, role assignment, and permission boundaries across the commerce product."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard eyebrow="Users" title="User access">
          <p className="text-sm text-slate-300">
            Manage who can access the product and which organization scope they work inside.
          </p>
          <Link href="/settings/users" className="mt-4 inline-flex">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Open Users
            </Button>
          </Link>
        </SectionCard>

        <SectionCard eyebrow="Roles" title="Role definitions">
          <p className="text-sm text-slate-300">
            Review role bundles that shape who can manage integrations, generate opportunities, and review actions.
          </p>
          <Link href="/settings/roles" className="mt-4 inline-flex">
            <Button variant="outline">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Open Roles
            </Button>
          </Link>
        </SectionCard>

        <SectionCard eyebrow="Permissions" title="Permission catalog">
          <p className="text-sm text-slate-300">
            Inspect the permission vocabulary behind read, manage, review, and access-governance behavior.
          </p>
          <Link href="/settings/permissions" className="mt-4 inline-flex">
            <Button variant="outline">
              <KeyRound className="mr-2 h-4 w-4" />
              Open Permissions
            </Button>
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
