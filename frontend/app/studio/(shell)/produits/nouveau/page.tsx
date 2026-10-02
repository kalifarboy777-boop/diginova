import { PageHeader } from "@/components/layout/app-shell";
import { ProductEditor } from "@/components/studio/editor";

export const metadata = { title: "Nouveau produit" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="Nouveau produit" />
      <ProductEditor />
    </>
  );
}
