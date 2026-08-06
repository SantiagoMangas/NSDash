import { getToken } from "@/lib/storage";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

interface RequestOptions extends RequestInit {
  cache?: RequestCache;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    // Optional: trigger logout logic here
    // For now, let the caller handle it
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      const body = await response.json();
      detail = (body as { detail?: unknown })?.detail;
    } catch {
      /* response body may not be JSON */
    }
    const error = new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
    (error as any).status = response.status;
    if (detail !== undefined) {
      (error as any).detail = detail;
    }
    throw error;
  }

  const data = await response.json();
  return data as T;
}

export async function get<T>(
  endpoint: string,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: "GET",
  });
}

export async function post<T>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function patch<T>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function put<T>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function del<T>(
  endpoint: string,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: "DELETE",
  });
}

export { BASE_URL };
