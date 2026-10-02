import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Candidature créateur", robots: { index: false } };

export default async function ApplicationLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-screen bg-bg-page">
      <header className="border-b border-border-default bg-bg-surface">
        <div className="container-site flex h-[76px] items-center justify-between">
          <Logo />
          <Link href="/aide/categorie/createurs" className="text-label text-brand-primary hover:underline">
            Besoin d’aide ? Guide du vendeur
          </Link>
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-[1120px] px-5 py-12">
        {children}
      </main>
    </div>
  );
}
