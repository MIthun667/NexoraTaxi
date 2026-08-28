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
import { Textarea } from '@/components/ui/textarea';
import { dispatchService } from '@/services/dispatch.service';

const schema = z.object({
  organizationId: z.string().uuid(),
  runId: z.string().uuid().optional().or(z.literal('')),
  assignmentId: z.string().uuid().optional().or(z.literal('')),
  incidentCode: z.string().min(2),
  incidentType: z.string().min(2),
  severity: z.string().min(2),
  title: z.string().min(3),
  description: z.string().optional(),
  status: z.string().optional(),
  reportedByUserId: z.string().uuid().optional().or(z.literal('')),
  reportedAt: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function DispatchIncidentForm({
  organizationId,
  incidentId,
  initialValues,
}: {
  organizationId?: string;
  incidentId?: string;
  initialValues?: Partial<Values>;
}) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: organizationId ?? initialValues?.organizationId ?? '',
      runId: initialValues?.runId ?? '',
      assignmentId: initialValues?.assignmentId ?? '',
      incidentCode: initialValues?.incidentCode ?? '',
      incidentType: initialValues?.incidentType ?? 'OTHER',
      severity: initialValues?.severity ?? 'MEDIUM',
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      status: initialValues?.status ?? 'OPEN',
      reportedByUserId: initialValues?.reportedByUserId ?? '',
      reportedAt:
        initialValues?.reportedAt ?? new Date().toISOString().slice(0, 16),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      incidentId
        ? dispatchService.updateIncident(incidentId, values)
        : dispatchService.createIncident(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-incidents'] });
      if (incidentId) {
        queryClient.invalidateQueries({ queryKey: ['dispatch-incidents', incidentId] });
      }
    },
  });

  return (
    <Card>
      <CardHeader className="mb-4 block">
        <CardTitle>{incidentId ? 'Update Operational Issue' : 'Create Operational Issue'}</CardTitle>
      </CardHeader>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Organization ID" error={form.formState.errors.organizationId?.message}>
          <Input {...form.register('organizationId')} />
        </FormField>
        <FormField label="Issue Code" error={form.formState.errors.incidentCode?.message}>
          <Input {...form.register('incidentCode')} />
        </FormField>
        <FormField label="Issue Type" error={form.formState.errors.incidentType?.message}>
          <Input {...form.register('incidentType')} />
        </FormField>
        <FormField label="Severity" error={form.formState.errors.severity?.message}>
          <Select {...form.register('severity')}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </FormField>
        <FormField label="Assignment ID" error={form.formState.errors.assignmentId?.message}>
          <Input {...form.register('assignmentId')} />
        </FormField>
        <FormField label="Work Order ID" error={form.formState.errors.runId?.message}>
          <Input {...form.register('runId')} />
        </FormField>
        <FormField label="Reported By User ID" error={form.formState.errors.reportedByUserId?.message}>
          <Input {...form.register('reportedByUserId')} />
        </FormField>
        <FormField label="Reported At" error={form.formState.errors.reportedAt?.message}>
          <Input type="datetime-local" {...form.register('reportedAt')} />
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Title" error={form.formState.errors.title?.message}>
            <Input {...form.register('title')} />
          </FormField>
        </div>
        <div className="md:col-span-2">
          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Textarea rows={4} {...form.register('description')} />
          </FormField>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : incidentId ? 'Update issue' : 'Create issue'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
