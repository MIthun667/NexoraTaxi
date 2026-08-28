import { Department } from '@prisma/client';

export const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  status: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type DepartmentResponse = Pick<
  Department,
  'id' | 'name' | 'code' | 'description' | 'status' | 'organizationId' | 'createdAt' | 'updatedAt'
>;

export const toDepartmentResponse = (department: DepartmentResponse): DepartmentResponse =>
  department;
