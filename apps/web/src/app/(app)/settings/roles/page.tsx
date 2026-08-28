import { EntityHeader } from '@/components/layout/entity-header';
import { ComingSoonPanel } from '@/modules/shared/components/coming-soon-panel';

export default function SettingsRolesPage() {
  return (
    <div className="space-y-6">
      <EntityHeader eyebrow="Settings / Roles" title="Role Management" description="Administer platform roles and role distribution strategy." />
      <ComingSoonPanel title="Role administration" description="Role CRUD and assignment analytics can be connected here next." />
    </div>
  );
}
