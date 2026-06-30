export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const opts: RequestInit = {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  };

  let res = await fetch(`${API_URL}${path}`, opts);

  if (res.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      res = await fetch(`${API_URL}${path}`, opts);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
