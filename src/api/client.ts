export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null | string[]>;

export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }

  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; details?: unknown };
    throw new ApiError(response.status, payload.error ?? `Request failed (${response.status})`, payload.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", withQuery(path, query)),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown = {}) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown = {}) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// Turns any thrown value into one readable sentence, including field problems from the API.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const details = error.details;
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0];
      if (typeof first === "string") return `${error.message}: ${details.join("; ")}`;
      if (first && typeof first === "object" && "message" in first) {
        const field = (first as { field?: string; message: string }).field;
        return field ? `${field}: ${(first as { message: string }).message}` : (first as { message: string }).message;
      }
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
