import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Bell, BookOpen, LayoutDashboard, Megaphone, MessageSquareText, Settings, ShieldCheck, Store, Truck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Select, StatusBadge } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { AdminRestaurant } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { OwnerContext, type OwnerContextValue } from "./ownerContext";

const BASE = "/restaurant-dashboard";

export function OwnerLayout() {
  const [params, setParams] = useSearchParams();
  const list = useApi<AdminRestaurant[]>("owner:restaurants", () => api.get("/owner/restaurants"));
  const restaurants = useMemo(() => list.data ?? [], [list.data]);
  const wanted = Number(params.get("restaurant"));
  const current = restaurants.find((r) => r.restaurant.id === wanted) ?? restaurants[0] ?? null;

  const value = useMemo<OwnerContextValue>(
    () => ({
      restaurants,
      loading: list.loading,
      error: list.error,
      current,
      select: (id) => {
        const next = new URLSearchParams(params);
        next.set("restaurant", String(id));
        setParams(next);
      },
      reload: list.reload,
    }),
    [restaurants, list.loading, list.error, current, params, setParams, list.reload],
  );

  const picker =
    restaurants.length > 0 ? (
      <div className="rounded-card border border-line bg-canvas p-3">
        <label htmlFor="owner-restaurant" className="sg-eyebrow">
          Restaurant
        </label>
        {restaurants.length > 1 ? (
          <Select
            id="owner-restaurant"
            value={current?.restaurant.id ?? ""}
            onChange={(e) => value.select(Number(e.target.value))}
            className="mt-1 min-h-10 py-1 text-[14px]"
          >
            {restaurants.map((r) => (
              <option key={r.restaurant.id} value={r.restaurant.id}>
                {r.restaurant.name}
              </option>
            ))}
          </Select>
        ) : (
          <p id="owner-restaurant" className="mt-1 text-[14.5px] font-semibold text-ink">
            {current?.restaurant.name}
          </p>
        )}
        {current && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <StatusBadge status={current.status} />
            {current.status === "APPROVED" && (
              <Link to={`/restaurants/${current.restaurant.id}`} className="text-[13px] font-semibold text-brand hover:text-brand-strong">
                View public page
              </Link>
            )}
          </div>
        )}
        <Link to={`${BASE}/profile?new=1`} className="mt-2 block text-[13px] font-semibold text-brand hover:text-brand-strong">
          + Add another restaurant
        </Link>
      </div>
    ) : null;

  return (
    <OwnerContext.Provider value={value}>
      <DashboardLayout
        title="Restaurant dashboard"
        base={BASE}
        sidebarTop={picker}
        nav={[
          { to: BASE, label: "Overview", icon: LayoutDashboard, end: true },
          { to: `${BASE}/profile`, label: "Restaurant profile", icon: Store },
          { to: `${BASE}/menu`, label: "Menu", icon: BookOpen },
          { to: `${BASE}/reviews`, label: "Reviews", icon: MessageSquareText },
          { to: `${BASE}/hygiene`, label: "Hygiene", icon: ShieldCheck },
          { to: `${BASE}/delivery`, label: "Delivery options", icon: Truck },
          { to: `${BASE}/advertising`, label: "Advertising", icon: Megaphone },
          { to: `${BASE}/notifications`, label: "Notifications", icon: Bell },
          { to: `${BASE}/settings`, label: "Account settings", icon: Settings },
        ]}
      />
    </OwnerContext.Provider>
  );
}
