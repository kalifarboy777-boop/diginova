import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { serverApi } from "@/lib/server-api";

export default async function VitrineLayout({ children }: { children: React.ReactNode }) {
  const home = await serverApi<{ announcement: { text: string } | null }>("/home", { revalidate: 300 }).catch(() => null);
  return (
    <>
      {home?.announcement && <AnnouncementBar text={home.announcement.text} />}
      <Header />
      <main id="contenu" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
