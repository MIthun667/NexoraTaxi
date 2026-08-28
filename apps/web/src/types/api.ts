export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: {
    code?: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
    path?: string;
  };
}

export type PaginatedResult<T> = {
  items: T[];
  meta?: ApiMeta;
};
