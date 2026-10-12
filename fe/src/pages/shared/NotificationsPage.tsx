import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, Tabs } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { Notification, Page } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { refreshUnreadCount } from "@/lib/useUnreadCount";
import { cn } from "@/lib/utils";

export function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const toast = useToast();
  const list = useApi<Page<Notification>>(`notifications:${tab}:${page}`, () =>
    api.get("/me/notifications", { unread: tab === "unread", page, size: 20 }),
  );

  const open = async (n: Notification) => {
    if (!n.read) {
      try {
        await api.post(`/me/notifications/${n.id}/read`);
        list.setData((p) => ({ ...p!, content: p!.content.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
        refreshUnreadCount();
      } catch {
        // Opening the link still works if marking read fails.
      }
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.post("/me/notifications/read-all");
      refreshUnreadCount();
      list.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (n: Notification) => {
    try {
      await api.del(`/me/notifications/${n.id}`);
      list.setData((p) => ({ ...p!, content: p!.content.filter((x) => x.id !== n.id) }));
      refreshUnreadCount();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about your reviews, audits, listings and campaigns."
        actions={
          <Button variant="secondary" size="sm" onClick={markAll}>
            <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read
          </Button>
        }
      />
      <Tabs
        label="Filter notifications"
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(0);
        }}
        tabs={[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread" },
        ]}
      />
      {list.loading && !list.data ? (
        <LoadingState label="Loading notifications" />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={Bell} title={tab === "unread" ? "You are all caught up" : "No notifications yet"} />
      ) : (
        <>
          <ul className="divide-y divide-line rounded-card border border-line bg-canvas">
            {list.data?.content.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-brand-wash/40")}>
                <span
                  className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")}
                  aria-hidden="true"
                />
                <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                  <p className={cn("text-[15px] text-ink", !n.read && "font-semibold")}>
                    {n.title}
                    {!n.read && <span className="sr-only"> (unread)</span>}
                  </p>
                  {n.body && <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{n.body}</p>}
                  <p className="mt-1 text-[12.5px] text-muted" title={formatDateTime(n.createdAt)}>
                    {timeAgo(n.createdAt)}
                  </p>
                </button>
                <Button variant="ghost" size="sm" aria-label="Delete notification" onClick={() => remove(n)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
}
