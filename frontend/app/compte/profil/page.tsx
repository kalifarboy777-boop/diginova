import { ProfileView } from "@/components/account/profile";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Profil & sécurité" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profil & sécurité" subtitle="Gérez vos informations, votre sécurité et vos notifications." />
      <ProfileView />
    </>
  );
}
