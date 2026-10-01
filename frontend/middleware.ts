import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE ?? "diginova-session";

/**
 * Garde d'accès côté frontend : /compte, /studio et /admin exigent une session.
 * Les rôles (CREATOR, MODERATOR, ADMIN) sont vérifiés par l'API (middleware Laravel + policies)
 * et par les layouts de chaque espace — ce filtre évite seulement d'afficher une page vide.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE) || [...req.cookies.getAll()].some((c) => c.name.startsWith("remember_web_"));
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?suite=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/compte/:path*", "/studio/:path*", "/admin/:path*"] };
