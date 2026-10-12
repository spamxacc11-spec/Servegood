import { Store } from "lucide-react";
import { ButtonLink, EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives";
import { useOwner } from "./ownerContext";

/**
 * The restaurant an owner page works on, plus the placeholder to show instead
 * while restaurants load or when the owner has not added one yet.
 */
export function useCurrentRestaurant() {
  const owner = useOwner();
  const placeholder = owner.loading ? (
    <LoadingState label="Loading your restaurants" />
  ) : owner.error ? (
    <ErrorState message={owner.error} onRetry={owner.reload} />
  ) : !owner.current ? (
    <EmptyState
      icon={Store}
      title="Add your restaurant to get started"
      action={<ButtonLink to="/restaurant-dashboard/profile?new=1">Add restaurant</ButtonLink>}
    >
      Once an admin approves it, diners can find it, and you can manage its menu, reviews and delivery prices here.
    </EmptyState>
  ) : null;
  return { owner, current: owner.current, placeholder };
}
