import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

const listeners = new Set<() => void>();

/** Ask every unread badge to refetch, e.g. after marking notifications read. */
export function refreshUnreadCount() {
  listeners.forEach((l) => l());
}

/** Unread notification count for the signed-in user, refreshed every minute and on demand. */
export function useUnreadCount() {
  const { status } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    const load = () =>
      api
        .get<{ unread: number }>("/me/notifications/unread-count")
        .then((r) => alive && setCount(r.unread))
        .catch(() => undefined);
    load();
    listeners.add(load);
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      listeners.delete(load);
      window.clearInterval(timer);
    };
  }, [status]);

  return status === "authenticated" ? count : 0;
}
