import { API_BASE_URL } from "@/config/api";

interface ValidationErrorDetail {
  msg?: string;
  loc?: string[];
}

interface ErrorResponse {
  detail?: string | ValidationErrorDetail[];
}

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Token getter function that can be set by the auth provider
let tokenGetter: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === "object" && value !== null && "detail" in value;
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = tokenGetter?.();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    let message: string;
    if (isErrorResponse(details) && typeof details.detail === "string") {
      message = details.detail;
    } else if (isErrorResponse(details) && Array.isArray(details.detail)) {
      message = details.detail
        .map((e) =>
          e.msg ? `${e.loc?.slice(-1)[0] ?? "field"}: ${e.msg}` : String(e),
        )
        .join("; ");
    } else {
      message = `Request failed with status ${response.status}`;
    }

    throw new ApiError(response.status, message, details);
  }

  return response;
}

export const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetchWithAuth(endpoint, { method: "GET" });
    return response.json();
  },

  post: async <T>(endpoint: string, data: unknown): Promise<T> => {
    const response = await fetchWithAuth(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  },

  patch: async <T>(endpoint: string, data: unknown): Promise<T> => {
    const response = await fetchWithAuth(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.json();
  },

  put: async <T>(endpoint: string, data: unknown): Promise<T> => {
    const response = await fetchWithAuth(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (response.status === 204) return undefined as T;
    return response.json();
  },

  delete: async (endpoint: string): Promise<void> => {
    await fetchWithAuth(endpoint, { method: "DELETE" });
  },
};

export { ApiError };
