'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ActionPanel } from '@/components/layout/action-panel';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useActOnApprovalStep } from '@/hooks/queries/use-approvals';

const schema = z.object({
  decisionType: z.enum(['APPROVE', 'REJECT', 'SEND_BACK', 'COMMENT', 'CANCEL']),
  comment: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function ApprovalDecisionPanel({ stepId }: { stepId: string }) {
  const mutation = useActOnApprovalStep(stepId);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      decisionType: 'APPROVE',
      comment: '',
    },
  });

  return (
    <ActionPanel
      title="Approval action panel"
      description="Capture a decision or comment on the current actionable approval step."
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Decision" error={form.formState.errors.decisionType?.message}>
          <Select {...form.register('decisionType')}>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
            <option value="SEND_BACK">Send Back</option>
            <option value="COMMENT">Comment</option>
            <option value="CANCEL">Cancel</option>
          </Select>
        </FormField>
        <FormField label="Comment" error={form.formState.errors.comment?.message}>
          <Textarea rows={4} {...form.register('comment')} />
        </FormField>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Processing...' : 'Submit decision'}
        </Button>
      </form>
    </ActionPanel>
  );
}
