import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Heart } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  restaurantId,
  initial,
  onChange,
  variant = "icon",
}: {
  restaurantId: number;
  initial: boolean | null;
  onChange?: (favorite: boolean) => void;
  variant?: "icon" | "button";
}) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [favorite, setFavorite] = useState(!!initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (status !== "authenticated") {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    const next = !favorite;
    setFavorite(next);
    setBusy(true);
    try {
      if (next) await api.put(`/me/favorites/${restaurantId}`);
      else await api.del(`/me/favorites/${restaurantId}`);
      onChange?.(next);
    } catch (e) {
      setFavorite(!next);
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const label = favorite ? "Remove from favourites" : "Save to favourites";

  if (variant === "button") {
    return (
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={favorite} className="sg-btn sg-btn-secondary">
        <Heart className={cn("h-4 w-4", favorite && "fill-alert text-alert")} aria-hidden="true" />
        {favorite ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={busy}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-canvas/95 text-ink shadow-raised transition-transform duration-150 hover:scale-105 active:scale-95"
    >
      <Heart className={cn("h-5 w-5", favorite ? "fill-alert text-alert" : "text-ink")} aria-hidden="true" />
    </button>
  );
}
