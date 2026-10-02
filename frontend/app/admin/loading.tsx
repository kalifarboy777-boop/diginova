import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
