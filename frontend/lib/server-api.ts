import "server-only";
import { cookies, headers } from "next/headers";
import { qs } from "./api";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const FRONTEND_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Appel de l'API depuis un Server Component. Les cookies du visiteur sont transmis
 * et l'en-tête Referer rend la requête « stateful » pour Sanctum (session).
 */
export async function serverApi<T>(
  path: string,
  { query, revalidate, auth = false }: { query?: Record<string, unknown>; revalidate?: number; auth?: boolean } = {},
): Promise<T> {
  const h: Record<string, string> = { Accept: "application/json", Referer: `${FRONTEND_URL}/`, Origin: FRONTEND_URL };
  if (auth) {
    const store = await cookies();
    h.Cookie = store.toString();
    const ua = (await headers()).get("user-agent");
    if (ua) h["User-Agent"] = ua;
  }
  const res = await fetch(`${BACKEND_URL}/api${path}${qs(query)}`, {
    headers: h,
    ...(auth ? { cache: "no-store" } : { next: { revalidate: revalidate ?? 60 } }),
  });
  if (!res.ok) {
    const err = new Error(`API ${res.status} ${path}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

/** Variante qui renvoie null pour une ressource absente (→ notFound()). */
export async function serverApiOrNull<T>(path: string, opts?: Parameters<typeof serverApi>[1]): Promise<T | null> {
  try {
    return await serverApi<T>(path, opts);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}
