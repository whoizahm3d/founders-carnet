/**
 * Unified API Client for FastAPI backend (/api/v1).
 * Handles base URLs, token injection, response parsing, and error normalization.
 */

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_BASE = RAW_API_URL.replace(/\/+$/, '') + '/api/v1';

export class ApiError extends Error {
  status: number;
  detail: string;
  fieldErrors?: Record<string, string>;

  constructor(status: number, detail: string, fieldErrors?: Record<string, string>) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

export const AUTH_EXPIRED_EVENT = 'carnet:auth-expired';

export interface RequestOptions extends RequestInit {
  token?: string | null;
  skipAuthRedirect?: boolean;
}

function parseFastApiDetail(data: unknown): { message: string; fieldErrors?: Record<string, string> } {
  if (!data || typeof data !== 'object') {
    return { message: 'An unexpected error occurred.' };
  }

  const payload = data as { detail?: unknown; message?: unknown };

  if (typeof payload.detail === 'string') {
    return { message: payload.detail };
  }

  if (typeof payload.message === 'string') {
    return { message: payload.message };
  }

  // Handle 422 validation detail array: [{ loc: ["body", "password"], msg: "..." }]
  if (Array.isArray(payload.detail)) {
    const fieldErrors: Record<string, string> = {};
    const messages: string[] = [];

    for (const item of payload.detail) {
      if (item && typeof item === 'object') {
        const entry = item as { loc?: unknown[]; msg?: string };
        const msg = entry.msg || 'Invalid field';
        const field = Array.isArray(entry.loc) ? String(entry.loc[entry.loc.length - 1]) : '';
        if (field) {
          fieldErrors[field] = msg;
        }
        messages.push(field ? `${field}: ${msg}` : msg);
      }
    }

    return {
      message: messages.length > 0 ? messages.join('. ') : 'Validation error',
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    };
  }

  return { message: 'An unexpected error occurred.' };
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, skipAuthRedirect = false, headers: customHeaders, body, ...rest } = options;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let finalBody: BodyInit | undefined = undefined;
  if (body !== undefined) {
    if (typeof body === 'string' || body instanceof FormData || body instanceof Blob) {
      finalBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      finalBody = JSON.stringify(body);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers,
      body: finalBody,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the server. Please check your internet connection.');
  }

  if (!res.ok) {
    let errorDetail = 'Request failed.';
    let fieldErrors: Record<string, string> | undefined;

    try {
      const errJson = await res.json();
      const parsed = parseFastApiDetail(errJson);
      errorDetail = parsed.message;
      fieldErrors = parsed.fieldErrors;
    } catch {
      errorDetail = res.statusText || `Request failed with status ${res.status}`;
    }

    // Trigger auth session expiration on 401 unless specifically opted out (such as /auth/login)
    if (res.status === 401 && !skipAuthRedirect && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    throw new ApiError(res.status, errorDetail, fieldErrors);
  }

  // 204 No Content
  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },
  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body: body as BodyInit });
  },
  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PUT', body: body as BodyInit });
  },
  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body: body as BodyInit });
  },
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
