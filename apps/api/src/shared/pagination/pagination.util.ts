import { PaginationMeta, PaginationRequest, ResolvedPagination } from './pagination.types';

export interface PaginationParameters {
  limit: number;
  page: number;
  total: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const resolvePagination = (
  pagination?: PaginationRequest,
): ResolvedPagination => {
  const page = pagination?.page ?? DEFAULT_PAGE;
  const requestedLimit = pagination?.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const buildPaginationMeta = ({
  limit,
  page,
  total,
}: PaginationParameters): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});
