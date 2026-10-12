import type { AuthResponse } from "./types";

/**
 * The single way the app talks to the ServeGood API.
 *
 * The access token lives only in memory. The refresh token is an httpOnly
 * cookie the browser sends to /api/auth, so script on the page can never read
 * it. A 401 triggers one refresh attempt (shared by every request in flight),
 * then the original request is retried once.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:8081/api" : "https://servegood.onrender.com/api")
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  fields: Record<string, string> | null;

  constructor(message: string, status: number, fields: Record<string, string> | null = null) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

type Envelope<T> = { success: boolean; data: T; message: string | null; timestamp: string };

type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse | null> | null = null;
const sessionListeners = new Set<(session: AuthResponse | null) => void>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** The auth provider subscribes so a silent refresh (or its failure) updates the signed-in user. */
export function onSessionChange(listener: (session: AuthResponse | null) => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, String(v)));
      else url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parse<T>(res: Response): Promise<{ data: T; message: string | null }> {
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    // Non-JSON body, e.g. a proxy error page.
  }
  if (!res.ok || !body || body.success === false) {
    const message =
      body?.message ??
      (res.status === 0 || res.status >= 500
        ? "The server is not responding. Please try again shortly."
        : `Request failed (${res.status})`);
    const fields =
      body && body.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? (body.data as unknown as Record<string, string>)
        : null;
    throw new ApiError(message, res.status, fields);
  }
  return { data: body.data, message: body.message };
}

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        let res = await fetch(buildUrl("/auth/refresh"), { method: "POST", credentials: "include" });
        if (res.status === 409) {
          // Another tab refreshed with the same cookie a moment ago; the browser now
          // holds the rotated cookie, so one short retry picks it up.
          await new Promise((r) => setTimeout(r, 400));
          res = await fetch(buildUrl("/auth/refresh"), { method: "POST", credentials: "include" });
        }
        const { data } = await parse<AuthResponse>(res);
        accessToken = data.accessToken;
        sessionListeners.forEach((l) => l(data));
        return data;
      } catch {
        accessToken = null;
        sessionListeners.forEach((l) => l(null));
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

/** Returns the data and the server's human-readable message (used for confirmations). */
async function send<T>(method: string, path: string, opts: RequestOptions = {}, retried = false): Promise<{
  data: T;
  message: string | null;
}> {
  const isForm = opts.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (opts.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      credentials: "include",
      signal: opts.signal,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("Cannot reach ServeGood right now. Check your connection and try again.", 0);
  }

  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    const session = await refreshSession();
    if (session) return send<T>(method, path, opts, true);
  }
  return parse<T>(res);
}

const request = async <T>(method: string, path: string, opts: RequestOptions = {}) =>
  (await send<T>(method, path, opts)).data;

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>("GET", path, { query, signal }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>("POST", path, { body, query }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown, query?: Query) => request<T>("PATCH", path, { body, query }),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, { body }),
  /** Same as the verbs above, but also returns the server's confirmation message. */
  send: <T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown, query?: Query) =>
    send<T>(method, path, { body, query }),
  upload: (file: File, purpose: string) => {
    const form = new FormData();
    form.append("file", file);
    return request<import("./types").UploadedFile>("POST", "/files", { body: form, query: { purpose } });
  },
};

/** Turns any thrown value into a sentence fit for the UI. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Please try again.";
}
