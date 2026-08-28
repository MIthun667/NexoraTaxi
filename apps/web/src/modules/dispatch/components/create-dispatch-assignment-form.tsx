'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { emptyToUndefined } from '@/lib/utils';
import { dispatchService } from '@/services/dispatch.service';

const createDispatchAssignmentSchema = z.object({
  organizationId: z.string().uuid(),
  driverId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  zoneId: z.string().uuid().optional().or(z.literal('')),
  shiftId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type CreateDispatchAssignmentValues = z.infer<typeof createDispatchAssignmentSchema>;

export function CreateDispatchAssignmentForm({ organizationId }: { organizationId?: string }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateDispatchAssignmentValues>({
    resolver: zodResolver(createDispatchAssignmentSchema),
    defaultValues: {
      organizationId: organizationId ?? '',
      driverId: '',
      vehicleId: '',
      zoneId: '',
      shiftId: '',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateDispatchAssignmentValues) =>
      dispatchService.createAssignment(emptyToUndefined(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-assignments'] });
    },
  });

  return (
    <Card>
      <CardHeader className="mb-4 block">
        <CardTitle>Create Operations Assignment</CardTitle>
      </CardHeader>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Organization ID" error={form.formState.errors.organizationId?.message}>
          <Input {...form.register('organizationId')} />
        </FormField>
        <FormField label="Operator ID" error={form.formState.errors.driverId?.message}>
          <Input {...form.register('driverId')} />
        </FormField>
        <FormField label="Asset ID" error={form.formState.errors.vehicleId?.message}>
          <Input {...form.register('vehicleId')} />
        </FormField>
        <FormField label="Zone ID" error={form.formState.errors.zoneId?.message}>
          <Input {...form.register('zoneId')} />
        </FormField>
        <FormField label="Shift ID" error={form.formState.errors.shiftId?.message}>
          <Input {...form.register('shiftId')} />
        </FormField>
        <FormField label="Notes" error={form.formState.errors.notes?.message}>
          <Input {...form.register('notes')} />
        </FormField>
        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Assignment'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
