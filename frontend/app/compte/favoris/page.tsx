import { AddAllFavorites, FavoritesView } from "@/components/account/favorites";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Favoris" };

export default function FavoritesPage() {
  return (
    <>
      <PageHeader title="Mes favoris" subtitle="Produits sauvegardés · nous vous prévenons si leur prix baisse." actions={<AddAllFavorites />} />
      <FavoritesView />
    </>
  );
}
