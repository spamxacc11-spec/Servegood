import { createContext, useContext } from "react";
import type { AdminRestaurant } from "@/lib/types";

export interface OwnerContextValue {
  restaurants: AdminRestaurant[];
  loading: boolean;
  error: string | null;
  /** The restaurant every owner page is working on, or null when the owner has none yet. */
  current: AdminRestaurant | null;
  select: (id: number) => void;
  reload: () => void;
}

export const OwnerContext = createContext<OwnerContextValue | null>(null);

export function useOwner() {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error("useOwner must be used inside the owner dashboard");
  return ctx;
}
