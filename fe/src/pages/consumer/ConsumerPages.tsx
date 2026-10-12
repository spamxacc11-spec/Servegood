import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Clock, Flag, Heart, MessageSquareText, Pencil, Search, Trash2 } from "lucide-react";
import { RestaurantSummaryCard } from "@/components/app/RestaurantSummaryCard";
import { ReviewCard } from "@/components/app/ReviewCard";
import { ReviewForm } from "@/components/app/ReviewForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  StatCard,
  StatusBadge,
  Tabs,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { REPORT_LABEL } from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type { ConsumerOverview, Menu, Page, Report, RestaurantSummary, Review, ReviewRequest } from "@/lib/types";
import { useApi } from "@/lib/useApi";

// ------------------------------------------------------------------ overview

export function ConsumerOverviewPage() {
  const { user } = useAuth();
  const stats = useApi<ConsumerOverview>("me:overview", () => api.get("/me/overview"));
  const recent = useApi<RestaurantSummary[]>("me:recent:4", () => api.get("/me/recently-viewed", { limit: 4 }));
  const favs = useApi<Page<RestaurantSummary>>("me:favs:preview", () => api.get("/me/favorites", { size: 3 }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your dashboard"
        title={`Hello, ${user?.fullName.split(" ")[0] ?? "there"}`}
        description="Your favourites, reviews and recent finds in one place."
        actions={
          <ButtonLink to="/restaurants">
            <Search className="h-4 w-4" aria-hidden="true" /> Find a restaurant
          </ButtonLink>
        }
      />
      {stats.error ? (
        <ErrorState message={stats.error} onRetry={stats.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Favourites" value={stats.data?.favorites ?? "—"} to="/dashboard/favorites" />
          <StatCard label="Reviews written" value={stats.data?.reviews ?? "—"} to="/dashboard/reviews" />
          <StatCard label="Unread notifications" value={stats.data?.unreadNotifications ?? "—"} to="/dashboard/notifications" />
          <StatCard label="Reports filed" value={stats.data?.reportsFiled ?? "—"} to="/dashboard/reviews?tab=reports" />
        </div>
      )}

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="sg-h3">Recently viewed</h2>
          <Link to="/dashboard/recent" className="text-[14px] font-semibold text-brand hover:text-brand-strong">
            See all
          </Link>
        </div>
        <div className="mt-3">
          {recent.loading && !recent.data ? (
            <LoadingState rows={1} />
          ) : recent.data && recent.data.length === 0 ? (
            <EmptyState icon={Clock} title="Nothing viewed yet">
              Restaurants you open appear here so you can find them again.
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {recent.data?.map((r) => <RestaurantSummaryCard key={r.id} restaurant={r} />)}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="sg-h3">Favourites</h2>
          <Link to="/dashboard/favorites" className="text-[14px] font-semibold text-brand hover:text-brand-strong">
            See all
          </Link>
        </div>
        <div className="mt-3">
          {favs.data && favs.data.content.length === 0 ? (
            <EmptyState icon={Heart} title="No favourites yet">
              Tap the heart on any restaurant to save it here.
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {favs.data?.content.map((r) => <RestaurantSummaryCard key={r.id} restaurant={r} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ favourites

export function FavoritesPage() {
  const [page, setPage] = useState(0);
  const favs = useApi<Page<RestaurantSummary>>(`me:favs:${page}`, () => api.get("/me/favorites", { page, size: 12 }));

  return (
    <div className="space-y-6">
      <PageHeader title="Favourite restaurants" description="Saved restaurants, with their current hygiene tier and ratings." />
      {favs.loading && !favs.data ? (
        <LoadingState />
      ) : favs.error ? (
        <ErrorState message={favs.error} onRetry={favs.reload} />
      ) : favs.data && favs.data.content.length === 0 ? (
        <EmptyState icon={Heart} title="No favourites yet" action={<ButtonLink to="/restaurants">Explore restaurants</ButtonLink>}>
          Tap the heart on any restaurant to save it here.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {favs.data?.content.map((r) => (
              <RestaurantSummaryCard
                key={r.id}
                restaurant={r}
                onFavoriteChange={(fav) => {
                  if (!fav) favs.setData((p) => ({ ...p!, content: p!.content.filter((x) => x.id !== r.id), totalElements: p!.totalElements - 1 }));
                }}
              />
            ))}
          </div>
          {favs.data && <Pagination page={favs.data.page} totalPages={favs.data.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ reviews and reports

export function MyReviewsPage() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"reviews" | "reports">(params.get("tab") === "reports" ? "reports" : "reviews");
  const [page, setPage] = useState(0);
  const toast = useToast();
  const reviews = useApi<Page<Review>>(tab === "reviews" ? `me:reviews:${page}` : null, () => api.get("/me/reviews", { page, size: 10 }));
  const reports = useApi<Page<Report>>(tab === "reports" ? `me:reports:${page}` : null, () => api.get("/me/reports", { page, size: 10 }));
  const [editing, setEditing] = useState<{ review: Review; menu: Menu[] } | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);

  const startEdit = async (review: Review) => {
    let menu: Menu[] = [];
    try {
      menu = await api.get<Menu[]>(`/restaurants/${review.restaurantId}/menu`);
    } catch {
      // Editing still works without the menu; dishes can be typed in.
    }
    setEditing({ review, menu });
  };

  const save = async (body: ReviewRequest) => {
    if (!editing) return;
    const { data, message } = await api.send<Review>("PUT", `/reviews/${editing.review.id}`, body);
    reviews.setData((p) => ({ ...p!, content: p!.content.map((r) => (r.id === data.id ? data : r)) }));
    setEditing(null);
    toast.success(message ?? "Review updated");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My reviews" description="Every review you have written and where it is in moderation." />
      <Tabs
        label="Reviews or reports"
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(0);
        }}
        tabs={[
          { value: "reviews", label: "Reviews" },
          { value: "reports", label: "Reports I filed" },
        ]}
      />

      {tab === "reviews" ? (
        reviews.loading && !reviews.data ? (
          <LoadingState />
        ) : reviews.error ? (
          <ErrorState message={reviews.error} onRetry={reviews.reload} />
        ) : reviews.data && reviews.data.content.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No reviews yet" action={<ButtonLink to="/restaurants">Find a restaurant to review</ButtonLink>}>
            Reviews you write appear here, along with their moderation status.
          </EmptyState>
        ) : (
          <>
            <div className="space-y-4">
              {reviews.data?.content.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  showStatus
                  showRestaurant
                  actions={
                    <>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(r)} aria-label={`Edit review of ${r.restaurantName}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(r)} aria-label={`Delete review of ${r.restaurantName}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  }
                >
                  <Link to={`/restaurants/${r.restaurantId}`} className="mt-3 inline-flex text-[14px] font-semibold text-brand hover:text-brand-strong">
                    Open restaurant
                  </Link>
                </ReviewCard>
              ))}
            </div>
            {reviews.data && <Pagination page={reviews.data.page} totalPages={reviews.data.totalPages} onChange={setPage} />}
          </>
        )
      ) : reports.loading && !reports.data ? (
        <LoadingState />
      ) : reports.error ? (
        <ErrorState message={reports.error} onRetry={reports.reload} />
      ) : reports.data && reports.data.content.length === 0 ? (
        <EmptyState icon={Flag} title="No reports filed">
          If something on ServeGood looks wrong, use &ldquo;Report a problem&rdquo; on the restaurant&rsquo;s page.
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3">
            {reports.data?.content.map((r) => (
              <li key={r.id} className="rounded-card border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-ink">
                    {REPORT_LABEL[r.type]} · <Link to={`/restaurants/${r.restaurantId}`} className="text-brand hover:text-brand-strong">{r.restaurantName}</Link>
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-[14px] text-muted">{r.details}</p>
                {r.resolutionNote && <p className="mt-2 text-[13.5px] text-ink">Outcome: {r.resolutionNote}</p>}
                <p className="mt-1 text-[12.5px] text-muted">Filed {formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
          {reports.data && <Pagination page={reports.data.page} totalPages={reports.data.totalPages} onChange={setPage} />}
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit your review of ${editing?.review.restaurantName ?? ""}`} wide>
        {editing && (
          <ReviewForm
            initial={editing.review}
            menuItems={editing.menu.flatMap((m) => m.items)}
            onSubmit={save}
            onCancel={() => setEditing(null)}
            submitLabel="Save and resubmit"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this review?"
        confirmLabel="Delete review"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.del(`/reviews/${deleting.id}`);
            reviews.setData((p) => ({ ...p!, content: p!.content.filter((r) => r.id !== deleting.id) }));
            toast.success("Review deleted");
            setDeleting(null);
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        Your review of {deleting?.restaurantName} will be removed and no longer count towards its rating.
      </ConfirmDialog>
    </div>
  );
}

// ------------------------------------------------------------------ recently viewed

export function RecentlyViewedPage() {
  const recent = useApi<RestaurantSummary[]>("me:recent:all", () => api.get("/me/recently-viewed", { limit: 24 }));
  return (
    <div className="space-y-6">
      <PageHeader title="Recently viewed" description="Restaurants you opened, most recent first." />
      {recent.loading && !recent.data ? (
        <LoadingState />
      ) : recent.error ? (
        <ErrorState message={recent.error} onRetry={recent.reload} />
      ) : recent.data && recent.data.length === 0 ? (
        <EmptyState icon={Clock} title="Nothing viewed yet" action={<ButtonLink to="/restaurants">Explore restaurants</ButtonLink>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recent.data?.map((r) => <RestaurantSummaryCard key={r.id} restaurant={r} />)}
        </div>
      )}
    </div>
  );
}
