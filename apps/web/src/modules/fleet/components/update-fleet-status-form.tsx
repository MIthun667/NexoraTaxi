'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ActionPanel } from '@/components/layout/action-panel';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useUpdateFleetStatus } from '@/hooks/queries/use-fleet-vehicles';

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

export function UpdateFleetStatusForm({ vehicleId }: { vehicleId: string }) {
  const mutation = useUpdateFleetStatus(vehicleId);
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
      title="Asset status control"
      description="Apply auditable readiness and compliance status updates to this asset."
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
          <Input {...form.register('newValue')} placeholder="IN_SERVICE" />
        </FormField>
        <FormField label="Reason" error={form.formState.errors.reason?.message}>
          <Input {...form.register('reason')} placeholder="Maintenance complete" />
        </FormField>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating...' : 'Update asset status'}
        </Button>
      </form>
    </ActionPanel>
  );
}
