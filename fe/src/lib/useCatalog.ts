import { useEffect, useState } from "react";
import { api } from "./api";
import type { Category, PlatformStats } from "./types";

interface Catalog {
  categories: Category[];
  localities: string[];
}

let cache: Promise<Catalog> | null = null;

/** Categories and neighbourhoods, fetched once per page load and shared by every filter panel. */
export function useCatalog(): Catalog {
  const [catalog, setCatalog] = useState<Catalog>({ categories: [], localities: [] });

  useEffect(() => {
    if (!cache) {
      cache = Promise.all([api.get<Category[]>("/categories"), api.get<PlatformStats>("/platform/stats")])
        .then(([categories, stats]) => ({ categories, localities: stats.localities }))
        .catch((e) => {
          cache = null;
          throw e;
        });
    }
    let alive = true;
    cache.then((c) => alive && setCatalog(c)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return catalog;
}
