import { PaginationMeta } from '../pagination/pagination.types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface SuccessResponse<T> {
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  meta: PaginationMeta;
}

export { PaginationMeta };
