import type { AuthUser } from "@/lib/types";

export const API_BASE = "/api";

function withParams(url: string, params?: Record<string, string | number | undefined | null>) {
  if (!params) return url;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const search = query.toString();
  return search ? `${url}?${search}` : url;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.error === "string") return data.error;
    const details = data.details ?? data.error;
    if (details?.formErrors?.length) return details.formErrors.join(", ");
    if (details?.fieldErrors) {
      const messages = Object.values(details.fieldErrors).flat();
      if (messages.length) return messages.join(", ");
    }
  } catch {
    // fall through
  }
  return res.status === 401 ? "Please sign in again" : `Request failed (${res.status})`;
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }

  if (!res.ok) throw new Error(await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Axios-shaped wrapper kept so the ported page components can stay close to the originals. */
export interface ApiResponse<T> {
  data: T;
}

export const api = {
  async get<T>(url: string, config?: { params?: Record<string, string | number | undefined | null> }): Promise<ApiResponse<T>> {
    return { data: await apiFetch<T>(withParams(url, config?.params)) };
  },
  async post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return { data: await apiFetch<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }) };
  },
  async put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return { data: await apiFetch<T>(url, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }) };
  },
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return { data: await apiFetch<T>(url, { method: "DELETE" }) };
  },
};

export function apiErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

export type { AuthUser };
