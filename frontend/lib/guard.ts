import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { serverApi } from "./server-api";
import type { User } from "./types";

/** Vérifie la session côté serveur (et le rôle) avant d'afficher un espace connecté. */
export async function requireUser(check?: (u: User) => boolean, fallback = "/compte"): Promise<User> {
  const { user } = await serverApi<{ user: User | null }>("/auth/me", { auth: true }).catch(() => ({ user: null }));
  if (!user) {
    const path = (await headers()).get("x-pathname") ?? "/compte";
    redirect(`/connexion?suite=${encodeURIComponent(path)}`);
  }
  if (check && !check(user)) redirect(fallback);
  return user;
}
