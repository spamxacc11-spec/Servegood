import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { ArrowLeft, Bell, Menu, X, type LucideIcon } from "lucide-react";
import logo from "@/assets/servegood-logo.png";
import { AccountMenu } from "@/components/app/AccountMenu";
import { useUnreadCount } from "@/lib/useUnreadCount";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

/**
 * One dashboard frame for every role: the landing page's header bar and type,
 * a quiet surface-coloured sidebar, and content on the white canvas. On phones
 * the sidebar becomes a drawer.
 */
export function DashboardLayout({
  title,
  nav,
  sidebarTop,
  base,
}: {
  title: string;
  nav: NavItem[];
  sidebarTop?: ReactNode;
  base: string;
}) {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const unread = useUnreadCount();

  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (drawer) setDrawer(false);
  }

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  // Only the owner's restaurant selection carries across pages; page filters do not.
  const selected = new URLSearchParams(location.search).get("restaurant");
  const carry = selected ? `?restaurant=${selected}` : "";

  const sidebar = (
    <nav aria-label={`${title} navigation`} className="flex flex-col gap-1 p-3">
      {sidebarTop && <div className="mb-3 px-1">{sidebarTop}</div>}
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to + carry}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-control px-3 text-[14.5px] font-medium transition-colors duration-150",
              isActive ? "bg-brand-wash text-brand-strong" : "text-ink hover:bg-canvas",
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {!!item.badge && (
            <span className="rounded-full bg-alert px-1.5 text-[12px] font-semibold text-white">{item.badge}</span>
          )}
        </NavLink>
      ))}
      <Link
        to="/"
        className="mt-4 flex min-h-11 items-center gap-3 rounded-control px-3 text-[14px] text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to ServeGood
      </Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#dashboard-main"
        className="sr-only rounded-control bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[60]"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="flex h-[64px] items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setDrawer((v) => !v)}
            aria-expanded={drawer}
            aria-controls="dashboard-drawer"
            aria-label={drawer ? "Close navigation" : "Open navigation"}
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-control text-ink hover:bg-surface lg:hidden"
          >
            {drawer ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
          <Link to="/" aria-label="ServeGood, home" className="flex items-center">
            <img src={logo} alt="ServeGood" width={373} height={88} className="h-7 w-auto sm:h-8" />
          </Link>
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
          <p className="hidden font-display text-[15px] font-bold text-ink sm:block">{title}</p>
          <div className="ml-auto flex items-center gap-1">
            <Link
              to={`${base}/notifications`}
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-control text-ink hover:bg-surface"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] rounded-full bg-alert px-1 text-center text-[11px] leading-[18px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-surface lg:block">
          <div className="sticky top-[64px] max-h-[calc(100vh-64px)] overflow-y-auto">{sidebar}</div>
        </aside>

        {drawer && (
          <div className="fixed inset-0 top-[64px] z-30 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-ink/30"
              onClick={() => setDrawer(false)}
            />
            <div id="dashboard-drawer" className="relative h-full w-[min(300px,85vw)] overflow-y-auto border-r border-line bg-surface">
              {sidebar}
            </div>
          </div>
        )}

        <main id="dashboard-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1100px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
