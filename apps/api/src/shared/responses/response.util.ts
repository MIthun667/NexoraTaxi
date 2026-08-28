import {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
  SuccessResponse,
} from './response.types';

export const buildApiResponse = <T>(
  message: string,
  data: T,
  meta?: PaginationMeta,
): ApiResponse<T> => ({
  success: true,
  message,
  data,
  ...(meta ? { meta } : {}),
});

export const buildSuccessResponse = <T>(
  message: string,
  data: T,
): SuccessResponse<T> => ({
  message,
  data,
});

export const buildPaginatedResponse = <T>(
  message: string,
  data: T[],
  meta: PaginationMeta,
): PaginatedResponse<T> => ({
  message,
  data,
  meta,
});
