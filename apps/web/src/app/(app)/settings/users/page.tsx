import { EntityHeader } from '@/components/layout/entity-header';
import { ComingSoonPanel } from '@/modules/shared/components/coming-soon-panel';

export default function SettingsUsersPage() {
  return (
    <div className="space-y-6">
      <EntityHeader eyebrow="Settings / Users" title="User Access" description="Manage operator accounts, lock states, invitations, and RBAC assignments." />
      <ComingSoonPanel title="User administration" description="User list, account state changes, and access governance can be layered here." />
    </div>
  );
}
