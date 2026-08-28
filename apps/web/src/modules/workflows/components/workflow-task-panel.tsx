'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ActionPanel } from '@/components/layout/action-panel';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useActOnWorkflowTask } from '@/hooks/queries/use-workflows';

const schema = z.object({
  actionType: z.enum(['APPROVE', 'REJECT', 'SEND_BACK', 'COMMENT', 'ASSIGN', 'ESCALATE', 'COMPLETE']),
  comment: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function WorkflowTaskPanel({ taskId }: { taskId: string }) {
  const mutation = useActOnWorkflowTask(taskId);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      actionType: 'COMPLETE',
      comment: '',
    },
  });

  return (
    <ActionPanel
      title="Task action panel"
      description="Apply a workflow action to the current task and capture execution context."
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Action" error={form.formState.errors.actionType?.message}>
          <Select {...form.register('actionType')}>
            <option value="COMPLETE">Complete</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
            <option value="SEND_BACK">Send Back</option>
            <option value="COMMENT">Comment</option>
            <option value="ASSIGN">Assign</option>
            <option value="ESCALATE">Escalate</option>
          </Select>
        </FormField>
        <FormField label="Comment" error={form.formState.errors.comment?.message}>
          <Textarea rows={4} {...form.register('comment')} />
        </FormField>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Processing...' : 'Execute task action'}
        </Button>
      </form>
    </ActionPanel>
  );
}
