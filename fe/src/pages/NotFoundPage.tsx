import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/primitives";

export function NotFoundPage() {
  return (
    <div className="sg-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Compass className="h-10 w-10 text-control" aria-hidden="true" />
      <h1 className="sg-h2 mt-4">We could not find that page</h1>
      <p className="sg-prose mt-3 text-muted">The link may be old, or the page may have moved.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/restaurants">Explore restaurants</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}
