import { apiClient, toPaginatedResult } from '@/lib/api-client';
import { PaginatedResult } from '@/types/api';
import { Department, Employee, Organization, Position } from '@/types/entities';

export type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type EmployeesQuery = ListQuery & {
  employmentStatus?: string;
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
};

export type DepartmentsQuery = ListQuery & {
  status?: string;
  organizationId?: string;
};

export type PositionsQuery = ListQuery & {
  status?: string;
  organizationId?: string;
  departmentId?: string;
};

export type OrganizationsQuery = ListQuery & {
  status?: string;
};

async function getPaginated<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
) {
  const response = await apiClient.get<T[]>(path, { query });
  return toPaginatedResult(response);
}

export const platformService = {
  listEmployees(query: EmployeesQuery): Promise<PaginatedResult<Employee>> {
    return getPaginated<Employee>('/employees', query);
  },
  getEmployee(id: string) {
    return apiClient.get<Employee>(`/employees/${id}`);
  },
  listDepartments(query: DepartmentsQuery): Promise<PaginatedResult<Department>> {
    return getPaginated<Department>('/departments', query);
  },
  getDepartment(id: string) {
    return apiClient.get<Department>(`/departments/${id}`);
  },
  listPositions(query: PositionsQuery): Promise<PaginatedResult<Position>> {
    return getPaginated<Position>('/positions', query);
  },
  getPosition(id: string) {
    return apiClient.get<Position>(`/positions/${id}`);
  },
  listOrganizations(query: OrganizationsQuery): Promise<PaginatedResult<Organization>> {
    return getPaginated<Organization>('/organizations', query);
  },
  getOrganization(id: string) {
    return apiClient.get<Organization>(`/organizations/${id}`);
  },
};
