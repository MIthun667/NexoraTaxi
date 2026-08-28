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
import { fleetService } from '@/services/fleet.service';

const createVehicleSchema = z.object({
  organizationId: z.string().uuid(),
  vehicleCode: z.string().min(2),
  plateNumber: z.string().min(4),
  make: z.string().min(2),
  model: z.string().min(2),
  modelYear: z.coerce.number().min(2000),
  vehicleClass: z.string().min(2),
  joinedAt: z.string().min(1),
});

type CreateVehicleValues = z.infer<typeof createVehicleSchema>;

export function CreateFleetVehicleForm({ organizationId }: { organizationId?: string }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateVehicleValues>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      organizationId: organizationId ?? '',
      vehicleCode: '',
      plateNumber: '',
      make: '',
      model: '',
      modelYear: new Date().getFullYear(),
      vehicleClass: 'SEDAN',
      joinedAt: new Date().toISOString().slice(0, 10),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateVehicleValues) => fleetService.createVehicle(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
    },
  });

  return (
    <Card>
      <CardHeader className="mb-4 block">
        <CardTitle>Create Asset</CardTitle>
      </CardHeader>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Organization ID" error={form.formState.errors.organizationId?.message}>
          <Input {...form.register('organizationId')} />
        </FormField>
        <FormField label="Asset Code" error={form.formState.errors.vehicleCode?.message}>
          <Input {...form.register('vehicleCode')} />
        </FormField>
        <FormField label="Plate Number" error={form.formState.errors.plateNumber?.message}>
          <Input {...form.register('plateNumber')} />
        </FormField>
        <FormField label="Make" error={form.formState.errors.make?.message}>
          <Input {...form.register('make')} />
        </FormField>
        <FormField label="Model" error={form.formState.errors.model?.message}>
          <Input {...form.register('model')} />
        </FormField>
        <FormField label="Model Year" error={form.formState.errors.modelYear?.message}>
          <Input type="number" {...form.register('modelYear')} />
        </FormField>
        <FormField label="Asset Class" error={form.formState.errors.vehicleClass?.message}>
          <Select {...form.register('vehicleClass')}>
            <option value="SEDAN">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="EXECUTIVE">Executive</option>
            <option value="PREMIUM">Premium</option>
            <option value="VAN">Van</option>
          </Select>
        </FormField>
        <FormField label="Joined At" error={form.formState.errors.joinedAt?.message}>
          <Input type="date" {...form.register('joinedAt')} />
        </FormField>
        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Asset'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
