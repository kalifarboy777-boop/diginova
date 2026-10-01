"use client";

import { Select } from "@/components/ui/field";
import { useQueryState } from "./use-query-state";

const SORTS: [string, string][] = [
  ["pertinence", "Pertinence"],
  ["popularite", "Popularité"],
  ["nouveautes", "Nouveautés"],
  ["prix-asc", "Prix croissant"],
  ["prix-desc", "Prix décroissant"],
  ["note", "Note"],
];

export function SortSelect({ search }: { search?: boolean }) {
  const { params, set } = useQueryState();
  const options = search ? SORTS : SORTS.slice(1);
  return (
    <Select aria-label="Trier" value={params.get("sort") ?? options[0][0]} onChange={(e) => set({ sort: e.target.value })} shellClassName="h-[42px] w-auto bg-bg-surface" className="text-label">
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          Trier : {l}
        </option>
      ))}
    </Select>
  );
}
