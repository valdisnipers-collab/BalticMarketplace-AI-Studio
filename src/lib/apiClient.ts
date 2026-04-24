// src/lib/apiClient.ts
//
// Small fetch wrapper that automatically attaches the canonical JWT to
// requests and normalises error handling. Not a full refactor of every
// fetch() call in the codebase — existing call sites keep working. New
// components should prefer these helpers.

const TOKEN_KEY = 'auth_token';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? {});
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

/**
 * Raw fetch with Authorization auto-attached. Returns the `Response` — caller
 * decides how to consume (text, json, blob).
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, { ...init, headers: buildHeaders(init) });
}

export interface ApiJsonInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * JSON helper: sends `body` as JSON (if provided) and parses the response as
 * JSON. Throws `ApiError` on non-2xx responses with the parsed body attached.
 */
export async function apiJson<T = unknown>(
  path: string,
  init: ApiJsonInit = {}
): Promise<T> {
  const { body, headers: rawHeaders, ...rest } = init;
  const headers = new Headers(rawHeaders ?? {});
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const serializedBody: BodyInit | undefined =
    body === undefined
      ? undefined
      : typeof body === 'string'
        ? body
        : JSON.stringify(body);
  const res = await apiFetch(path, {
    ...rest,
    headers,
    body: serializedBody,
  });
  const text = await res.text();
  const parsed = text ? safeParse(text) : null;
  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as any).error === 'string')
        ? (parsed as any).error
        : `Request failed: ${res.status}`;
    throw new ApiError(res.status, message, parsed);
  }
  return parsed as T;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export const apiGet = <T = unknown>(path: string, init?: ApiJsonInit) =>
  apiJson<T>(path, { ...init, method: 'GET' });

export const apiPost = <T = unknown>(path: string, body?: unknown, init?: ApiJsonInit) =>
  apiJson<T>(path, { ...init, method: 'POST', body });

export const apiPut = <T = unknown>(path: string, body?: unknown, init?: ApiJsonInit) =>
  apiJson<T>(path, { ...init, method: 'PUT', body });

export const apiPatch = <T = unknown>(path: string, body?: unknown, init?: ApiJsonInit) =>
  apiJson<T>(path, { ...init, method: 'PATCH', body });

export const apiDelete = <T = unknown>(path: string, init?: ApiJsonInit) =>
  apiJson<T>(path, { ...init, method: 'DELETE' });
