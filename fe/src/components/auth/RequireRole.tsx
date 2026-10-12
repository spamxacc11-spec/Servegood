import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { ShieldAlert } from "lucide-react";
import { ButtonLink, Spinner } from "@/components/ui/primitives";
import { homeFor, useAuth } from "@/lib/auth";
import type { RoleName } from "@/lib/types";

/**
 * Route guard. Signed-out visitors go to sign-in and come back afterwards;
 * signed-in users without the role see a clear "not for your account" page.
 * The API enforces the same rules independently, so this is convenience, not security.
 */
export function RequireRole({ roles, children }: { roles?: RoleName[]; children: ReactNode }) {
  const { status, user, hasRole } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }
  if (status === "anonymous" || !user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (roles && !hasRole(...roles)) {
    return <Forbidden home={homeFor(user)} />;
  }
  return <>{children}</>;
}

export function Forbidden({ home }: { home: string }) {
  return (
    <div className="sg-container flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <ShieldAlert className="h-10 w-10 text-caution" aria-hidden="true" />
      <h1 className="sg-h2 mt-4">This area is not available to your account</h1>
      <p className="sg-prose mt-3 text-muted">
        Each dashboard belongs to one kind of account. Yours has its own dashboard with everything you can do.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink to={home}>Go to my dashboard</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}
