import { EntityHeader } from '@/components/layout/entity-header';
import { ComingSoonPanel } from '@/modules/shared/components/coming-soon-panel';

export default function SettingsPermissionsPage() {
  return (
    <div className="space-y-6">
      <EntityHeader eyebrow="Settings / Permissions" title="Permission Catalog" description="Review and govern capability scopes across the operations platform." />
      <ComingSoonPanel title="Permission catalog" description="Permission inspection and role binding management can be added here." />
    </div>
  );
}
