'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ActionPanel } from '@/components/layout/action-panel';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useUpdateDriverStatus } from '@/hooks/queries/use-drivers';

const schema = z.object({
  statusCategory: z.enum([
    'ONBOARDING_STATUS',
    'OPERATIONAL_STATUS',
    'COMPLIANCE_STATUS',
    'ASSIGNMENT_STATUS',
  ]),
  newValue: z.string().min(1),
  reason: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function UpdateDriverStatusForm({ driverId }: { driverId: string }) {
  const mutation = useUpdateDriverStatus(driverId);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      statusCategory: 'OPERATIONAL_STATUS',
      newValue: 'ACTIVE',
      reason: '',
    },
  });

  return (
    <ActionPanel
      title="Operator status control"
      description="Record auditable lifecycle status updates for this operator profile."
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Status category" error={form.formState.errors.statusCategory?.message}>
          <Select {...form.register('statusCategory')}>
            <option value="ONBOARDING_STATUS">Onboarding status</option>
            <option value="OPERATIONAL_STATUS">Operational status</option>
            <option value="COMPLIANCE_STATUS">Compliance status</option>
            <option value="ASSIGNMENT_STATUS">Assignment status</option>
          </Select>
        </FormField>
        <FormField label="New value" error={form.formState.errors.newValue?.message}>
          <Input {...form.register('newValue')} placeholder="ACTIVE" />
        </FormField>
        <FormField label="Reason" error={form.formState.errors.reason?.message}>
          <Input {...form.register('reason')} placeholder="Operational review completed" />
        </FormField>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating...' : 'Update operator status'}
        </Button>
      </form>
    </ActionPanel>
  );
}
