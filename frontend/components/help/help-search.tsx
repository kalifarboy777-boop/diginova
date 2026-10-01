"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function HelpSearch({ initial = "" }: { initial?: string }) {
  const [q, setQ] = React.useState(initial);
  const router = useRouter();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/aide?q=${encodeURIComponent(q)}#resultats`);
      }}
      className="mx-auto flex w-full max-w-[640px] items-center gap-3 rounded-lg border border-border-default bg-bg-surface p-2 pl-5 shadow-soft"
    >
      <Search className="size-5 text-text-tertiary" />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher dans l’aide" placeholder="Ex. : je n’ai pas reçu mon fichier" className="h-11 flex-1 bg-transparent text-body-lg outline-none placeholder:text-text-tertiary" />
      <Button type="submit">Rechercher</Button>
    </form>
  );
}
