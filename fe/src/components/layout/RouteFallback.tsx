import { Spinner } from "@/components/ui/primitives";

/** Shown while a dashboard's code loads on a first visit straight to its URL. */
export function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Loading" />
    </div>
  );
}
