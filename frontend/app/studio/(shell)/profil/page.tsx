import { PageHeader } from "@/components/layout/app-shell";
import { StudioProfileView } from "@/components/studio/extras";

export const metadata = { title: "Profil public" };

export default function Page() {
  return (
    <>
      <PageHeader title="Profil public" subtitle="Ce que voient les acheteurs sur votre boutique." />
      <StudioProfileView />
    </>
  );
}
