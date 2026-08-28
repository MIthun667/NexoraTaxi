import { Employee } from '@prisma/client';

export const EMPLOYEE_SELECT = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  workEmail: true,
  phoneNumber: true,
  employmentStatus: true,
  hireDate: true,
  organizationId: true,
  departmentId: true,
  positionId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type EmployeeResponse = Pick<
  Employee,
  | 'id'
  | 'employeeCode'
  | 'firstName'
  | 'lastName'
  | 'workEmail'
  | 'phoneNumber'
  | 'employmentStatus'
  | 'hireDate'
  | 'organizationId'
  | 'departmentId'
  | 'positionId'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
>;

export const toEmployeeResponse = (employee: EmployeeResponse): EmployeeResponse => employee;
