import { Creators } from "@/components/admin/creators";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Créateurs" };

export default function CreatorsPage() {
  return (
    <>
      <PageHeader title="Créateurs" />
      <Creators />
    </>
  );
}
