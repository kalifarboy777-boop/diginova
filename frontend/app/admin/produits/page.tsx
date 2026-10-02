import { Moderation, ModerationRules } from "@/components/admin/moderation";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Modération des produits" };

export default function ModerationPage() {
  return (
    <>
      <PageHeader
        title="Modération des produits"
        actions={<ModerationRules />}
        search="/admin/catalogue"
      />
      <Moderation />
    </>
  );
}
