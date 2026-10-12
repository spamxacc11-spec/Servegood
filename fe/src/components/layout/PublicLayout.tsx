import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ScrollTrigger } from "@/lib/motion";

/**
 * Header, page, footer: the landing page's frame, shared by every public page.
 * Handles "/#section" links, which the router does not scroll to by itself.
 */
export function PublicLayout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section has rendered.
      const id = window.setTimeout(() => {
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
      }, 50);
      return () => window.clearTimeout(id);
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  // Pages change height as data loads; keep scroll-driven animations in step.
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div id="top" className="min-h-screen bg-canvas">
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
