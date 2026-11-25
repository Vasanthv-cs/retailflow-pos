/**
 * Spring Boot REST API client for RetailFlow POS backend integration.
 * Connects to Spring Boot modular monolith at `VITE_API_BASE_URL` (default: http://localhost:8080/api/v1).
 */

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080/api/v1';

export interface ApiResponseEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
  message?: string;
}

export interface ApiRequestOptions extends RequestInit {
  token?: string;
}

let storedAuthToken: string | null = null;

// Purge any legacy token stored in localStorage from earlier versions
if (typeof window !== 'undefined' && window.localStorage) {
  window.localStorage.removeItem('retailflow_jwt');
}

export function setApiAuthToken(token: string | null) {
  storedAuthToken = token;
  if (!token && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('retailflow_jwt');
  }
}

export function getApiAuthToken(): string | null {
  return storedAuthToken;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token = getApiAuthToken() ?? undefined, headers, ...rest } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // fallback to status text
    }
    throw new Error(`API ${response.status}: ${errorMsg}`);
  }

  const json = await response.json();
  // Unwrap standard envelope if present
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...options }),
};
