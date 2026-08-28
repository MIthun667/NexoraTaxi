'use client';

import { ActionPanel } from '@/components/layout/action-panel';
import { Button } from '@/components/ui/button';
import { useReleaseDispatchAssignment } from '@/hooks/queries/use-dispatch-assignments';

export function ReleaseAssignmentPanel({ assignmentId }: { assignmentId: string }) {
  const mutation = useReleaseDispatchAssignment(assignmentId);

  return (
    <ActionPanel
      title="Assignment release control"
      description="Release the current operator-asset assignment and return the slot to the active operations pool."
    >
      <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Releasing...' : 'Release assignment'}
      </Button>
    </ActionPanel>
  );
}
