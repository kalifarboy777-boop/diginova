/**
 * Client de l'API Laravel (exécuté dans le navigateur).
 * Même origine via le proxy Next (/api → Laravel) : cookie de session Sanctum + jeton XSRF.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Premier message d'erreur d'un champ (validation Laravel). */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

let csrfReady: Promise<void> | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function ensureCsrf(): Promise<void> {
  if (readCookie("XSRF-TOKEN")) return;
  csrfReady ??= fetch("/sanctum/csrf-cookie", { credentials: "include" }).then(() => undefined);
  await csrfReady;
  csrfReady = null;
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; query?: Record<string, unknown> };

export function qs(query?: Record<string, unknown>): string {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(`${k}[]`, String(x)));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function api<T = unknown>(path: string, { body, query, headers, method = "GET", ...init }: Options = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (method !== "GET") await ensureCsrf();
  const res = await fetch(`/api${path}${qs(query)}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-XSRF-TOKEN": readCookie("XSRF-TOKEN") ?? "" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    ...init,
  });

  if (res.status === 419) {
    // Jeton CSRF expiré : on le régénère une fois.
    document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
    return api<T>(path, { body, query, headers, method, ...init });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message || defaultMessage(res.status);
    throw new ApiError(res.status, message, (data as { errors?: Record<string, string[]> } | null)?.errors ?? {});
  }
  return data as T;
}

function defaultMessage(status: number): string {
  if (status === 401) return "Connectez-vous pour continuer.";
  if (status === 403) return "Accès refusé.";
  if (status === 404) return "Élément introuvable.";
  if (status === 429) return "Trop de tentatives. Réessayez dans un instant.";
  return "Une erreur est survenue. Réessayez.";
}

/** Télécharge un fichier binaire (CSV, PDF) servi par l'API. */
export async function download(path: string, fileName: string): Promise<void> {
  const res = await fetch(`/api${path}`, { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, defaultMessage(res.status));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
