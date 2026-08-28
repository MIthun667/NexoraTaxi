import { env } from './env';
import { clearStoredSession, getStoredSession } from './storage';
import { ApiErrorResponse, ApiMeta, ApiSuccessResponse, PaginatedResult } from '@/types/api';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  token?: string | null;
};

export class ApiClientError extends Error {
  code?: string;
  details?: unknown;
  requestId?: string;

  constructor(message: string, options?: { code?: string; details?: unknown; requestId?: string }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = options?.code;
    this.details = options?.details;
    this.requestId = options?.requestId;
  }
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const normalizedBase = env.apiBaseUrl.endsWith('/')
    ? env.apiBaseUrl
    : `${env.apiBaseUrl}/`;
  const absoluteBase = /^https?:\/\//i.test(normalizedBase)
    ? normalizedBase
    : `${typeof window === 'undefined' ? 'http://127.0.0.1:3001' : window.location.origin}${normalizedBase.startsWith('/') ? normalizedBase : `/${normalizedBase}`}`;
  const url = new URL(path.replace(/^\//, ''), absoluteBase);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccessResponse<T>> {
  const session = getStoredSession();
  const token = options.token ?? session?.accessToken;
  const requestUrl = buildUrl(path, options.query);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiClientError(
      `Unable to reach the Nexora API at ${env.apiBaseUrl}. Verify the backend is running and the frontend API base URL/proxy is correct.`,
      {
        code: 'API_UNREACHABLE',
        details: error instanceof Error ? error.message : 'Unknown network error',
      },
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccessResponse<T>
    | ApiErrorResponse
    | null;
  const responseRequestId =
    payload && 'success' in payload && payload.success === false ? payload.meta?.requestId : undefined;

  if (!response.ok || !payload || payload.success === false) {
    if (response.status === 401) {
      clearStoredSession();
    }

    throw new ApiClientError(payload?.message ?? 'Request failed.', {
      code: payload && 'error' in payload ? payload.error?.code : undefined,
      details: payload && 'error' in payload ? payload.error?.details : undefined,
      requestId: responseRequestId,
    });
  }

  return payload;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export function toPaginatedResult<T>(response: ApiSuccessResponse<T[]>) {
  return {
    items: response.data,
    meta: response.meta,
  } satisfies PaginatedResult<T>;
}

export function getResponseMeta<T>(response: ApiSuccessResponse<T>): ApiMeta | undefined {
  return response.meta;
}
