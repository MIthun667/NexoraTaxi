import { Position } from '@prisma/client';

export const POSITION_SELECT = {
  id: true,
  title: true,
  code: true,
  description: true,
  gradeLevel: true,
  status: true,
  organizationId: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PositionResponse = Pick<
  Position,
  | 'id'
  | 'title'
  | 'code'
  | 'description'
  | 'gradeLevel'
  | 'status'
  | 'organizationId'
  | 'departmentId'
  | 'createdAt'
  | 'updatedAt'
>;

export const toPositionResponse = (position: PositionResponse): PositionResponse => position;
