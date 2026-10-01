"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { api } from "./api";
import type { Cart, User } from "./types";

/** État global : utilisateur connecté et panier (compteur du header). */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function useMe() {
  const q = useQuery({ queryKey: ["me"], queryFn: () => api<{ user: User | null }>("/auth/me"), staleTime: 60_000 });
  return { user: q.data?.user ?? null, loading: q.isLoading, refetch: q.refetch };
}

export function useCart() {
  return useQuery({ queryKey: ["cart"], queryFn: () => api<Cart>("/cart") });
}

/** Met à jour le panier en cache après une mutation (réponse = panier complet). */
export function useSetCart() {
  const qc = useQueryClient();
  return (cart: Cart) => qc.setQueryData(["cart"], cart);
}

export function useRefreshSession() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["me"] }), qc.invalidateQueries({ queryKey: ["cart"] })]);
}
