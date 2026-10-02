import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/compte", "/studio", "/admin", "/checkout", "/panier", "/connexion", "/inscription", "/verification", "/dev", "/api"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
