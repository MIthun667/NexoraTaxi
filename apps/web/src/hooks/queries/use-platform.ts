'use client';

import { useQuery } from '@tanstack/react-query';

import {
  DepartmentsQuery,
  EmployeesQuery,
  OrganizationsQuery,
  PositionsQuery,
  platformService,
} from '@/services/platform.service';

export function useEmployees(query: EmployeesQuery) {
  return useQuery({
    queryKey: ['employees', query],
    queryFn: () => platformService.listEmployees(query),
  });
}

export function useEmployee(id?: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => platformService.getEmployee(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useDepartments(query: DepartmentsQuery) {
  return useQuery({
    queryKey: ['departments', query],
    queryFn: () => platformService.listDepartments(query),
  });
}

export function useDepartment(id?: string) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => platformService.getDepartment(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function usePositions(query: PositionsQuery) {
  return useQuery({
    queryKey: ['positions', query],
    queryFn: () => platformService.listPositions(query),
  });
}

export function usePosition(id?: string) {
  return useQuery({
    queryKey: ['positions', id],
    queryFn: () => platformService.getPosition(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useOrganizations(query: OrganizationsQuery) {
  return useQuery({
    queryKey: ['organizations', query],
    queryFn: () => platformService.listOrganizations(query),
  });
}

export function useOrganization(id?: string) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: () => platformService.getOrganization(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
}
