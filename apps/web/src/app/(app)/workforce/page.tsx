import { EntityHeader } from '@/components/layout/entity-header';
import { ComingSoonPanel } from '@/modules/shared/components/coming-soon-panel';

export default function WorkforcePage() {
  return (
    <div className="space-y-6">
      <EntityHeader
        eyebrow="Workforce"
        title="Workforce Operations"
        description="Centralize operational divisions, roles, and workforce member management."
      />
      <ComingSoonPanel
        title="Workforce command views"
        description="Workforce analytics, staffing controls, and lifecycle workflows plug into this area."
      />
    </div>
  );
}
