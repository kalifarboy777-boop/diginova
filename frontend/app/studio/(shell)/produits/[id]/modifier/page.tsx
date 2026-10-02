import { PageHeader } from "@/components/layout/app-shell";
import { ProductEditor } from "@/components/studio/editor";

export const metadata = { title: "Modifier le produit" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Modifier le produit" />
      <ProductEditor id={Number(id)} />
    </>
  );
}
