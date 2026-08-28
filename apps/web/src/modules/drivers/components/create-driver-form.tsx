'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { emptyToUndefined } from '@/lib/utils';
import { driversService } from '@/services/drivers.service';

const createDriverSchema = z.object({
  organizationId: z.string().uuid(),
  driverCode: z.string().min(2),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  workEmail: z.string().email().optional().or(z.literal('')),
  licenseNumber: z.string().min(4),
  joinedAt: z.string().min(1),
  onboardingStatus: z.string().default('PENDING'),
});

type CreateDriverValues = z.infer<typeof createDriverSchema>;

export function CreateDriverForm({ organizationId }: { organizationId?: string }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateDriverValues>({
    resolver: zodResolver(createDriverSchema),
    defaultValues: {
      organizationId: organizationId ?? '',
      driverCode: '',
      firstName: '',
      lastName: '',
      workEmail: '',
      licenseNumber: '',
      joinedAt: new Date().toISOString().slice(0, 10),
      onboardingStatus: 'PENDING',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateDriverValues) => driversService.create(emptyToUndefined(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      form.reset({
        ...form.getValues(),
        driverCode: '',
        firstName: '',
        lastName: '',
        workEmail: '',
        licenseNumber: '',
      });
    },
  });

  return (
    <Card>
      <CardHeader className="mb-4 block">
        <CardTitle>Create Operator</CardTitle>
      </CardHeader>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Organization ID" error={form.formState.errors.organizationId?.message}>
          <Input {...form.register('organizationId')} />
        </FormField>
        <FormField label="Workforce ID" error={form.formState.errors.driverCode?.message}>
          <Input {...form.register('driverCode')} />
        </FormField>
        <FormField label="First Name" error={form.formState.errors.firstName?.message}>
          <Input {...form.register('firstName')} />
        </FormField>
        <FormField label="Last Name" error={form.formState.errors.lastName?.message}>
          <Input {...form.register('lastName')} />
        </FormField>
        <FormField label="Work Email" error={form.formState.errors.workEmail?.message}>
          <Input type="email" {...form.register('workEmail')} />
        </FormField>
        <FormField label="License Number" error={form.formState.errors.licenseNumber?.message}>
          <Input {...form.register('licenseNumber')} />
        </FormField>
        <FormField label="Joined At" error={form.formState.errors.joinedAt?.message}>
          <Input type="date" {...form.register('joinedAt')} />
        </FormField>
        <FormField label="Onboarding Status" error={form.formState.errors.onboardingStatus?.message}>
          <Select {...form.register('onboardingStatus')}>
            <option value="PENDING">Pending</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </FormField>
        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Operator'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
