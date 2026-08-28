'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { approvalsService } from '@/services/approvals.service';

const createApprovalSchema = z.object({
  organizationId: z.string().uuid(),
  entityType: z.string().min(2),
  entityId: z.string().min(2),
  title: z.string().min(3),
  description: z.string().optional(),
  requestedByUserId: z.string().uuid(),
  steps: z
    .array(
      z.object({
        stepKey: z.string().min(2),
        title: z.string().min(2),
        sequenceOrder: z.coerce.number().min(1),
        approverRoleCode: z.string().min(2),
      }),
    )
    .min(1),
});

type CreateApprovalValues = z.infer<typeof createApprovalSchema>;

export function CreateApprovalRequestForm({ organizationId, requesterUserId }: { organizationId?: string; requesterUserId?: string }) {
  const form = useForm<CreateApprovalValues>({
    resolver: zodResolver(createApprovalSchema),
    defaultValues: {
      organizationId: organizationId ?? '',
      entityType: 'driver',
      entityId: '',
      title: '',
      description: '',
      requestedByUserId: requesterUserId ?? '',
      steps: [{ stepKey: 'INITIAL_REVIEW', title: 'Initial Review', sequenceOrder: 1, approverRoleCode: 'PLATFORM_ADMIN' }],
    },
  });

  const steps = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  const mutation = useMutation({
    mutationFn: (values: CreateApprovalValues) => approvalsService.createRequest(values),
  });

  return (
    <Card>
      <CardHeader className="mb-4 block">
        <CardTitle>Create Approval Request</CardTitle>
      </CardHeader>
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Organization ID" error={form.formState.errors.organizationId?.message}>
            <Input {...form.register('organizationId')} />
          </FormField>
          <FormField label="Requested By User ID" error={form.formState.errors.requestedByUserId?.message}>
            <Input {...form.register('requestedByUserId')} />
          </FormField>
          <FormField label="Entity Type" error={form.formState.errors.entityType?.message}>
            <Input {...form.register('entityType')} />
          </FormField>
          <FormField label="Entity ID" error={form.formState.errors.entityId?.message}>
            <Input {...form.register('entityId')} />
          </FormField>
        </div>
        <FormField label="Title" error={form.formState.errors.title?.message}>
          <Input {...form.register('title')} />
        </FormField>
        <FormField label="Description" error={form.formState.errors.description?.message}>
          <Textarea {...form.register('description')} />
        </FormField>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Approval Steps
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                steps.append({
                  stepKey: `STEP_${steps.fields.length + 1}`,
                  title: 'Approval Step',
                  sequenceOrder: steps.fields.length + 1,
                  approverRoleCode: 'PLATFORM_ADMIN',
                })
              }
            >
              Add Step
            </Button>
          </div>
          {steps.fields.map((field, index) => (
            <div key={field.id} className="grid gap-4 rounded-2xl border border-white/10 p-4 md:grid-cols-3">
              <Input placeholder="Step key" {...form.register(`steps.${index}.stepKey`)} />
              <Input placeholder="Title" {...form.register(`steps.${index}.title`)} />
              <Input placeholder="Approver role code" {...form.register(`steps.${index}.approverRoleCode`)} />
            </div>
          ))}
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create Approval Request'}
        </Button>
      </form>
    </Card>
  );
}
