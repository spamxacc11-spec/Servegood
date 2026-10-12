import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ChevronDown, MessageSquareReply, MessageSquareText, ShieldCheck } from "lucide-react";
import { AuditBreakdown } from "@/components/app/AuditBreakdown";
import { HygieneScoreRing } from "@/components/app/HygieneScore";
import { RestaurantForm } from "@/components/app/RestaurantForm";
import { ReviewCard } from "@/components/app/ReviewCard";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  Pagination,
  StatCard,
  StatusBadge,
  Tabs,
  Textarea,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { formatDate, rating, timeAgo } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { Audit, OwnerOverview, Page, RestaurantDetail, RestaurantRequest, Review, ReviewStatus } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";
import { useCurrentRestaurant } from "./useCurrentRestaurant";

// ------------------------------------------------------------------ overview

export function OwnerOverviewPage() {
  const { current, placeholder } = useCurrentRestaurant();
  const id = current?.restaurant.id;
  const data = useApi<OwnerOverview>(id ? `owner:overview:${id}` : null, () => api.get(`/owner/restaurants/${id}/overview`));

  if (placeholder) return <div className="space-y-6"><PageHeader title="Restaurant dashboard" />{placeholder}</div>;
  const o = data.data;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Overview" title={current!.restaurant.name} description="Views, ratings and hygiene at a glance." />

      {current!.status !== "APPROVED" && (
        <Alert tone={current!.status === "PENDING_APPROVAL" ? "info" : "warning"} title={`Listing ${current!.status === "PENDING_APPROVAL" ? "awaiting approval" : current!.status.toLowerCase()}`}>
          {current!.status === "PENDING_APPROVAL"
            ? "A ServeGood admin will review your restaurant details. You can keep editing your profile and menu in the meantime."
            : current!.statusReason ?? "Contact ServeGood support for details."}
        </Alert>
      )}

      {data.loading && !o ? (
        <LoadingState />
      ) : data.error ? (
        <ErrorState message={data.error} onRetry={data.reload} />
      ) : o ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Page views, last 30 days" value={o.views30d} hint={`${o.viewsTotal} all time`} />
            <StatCard label="Total reviews" value={o.totalReviews} hint={`${o.pendingReviews} in moderation`} to="/restaurant-dashboard/reviews" />
            <StatCard label="Average rating" value={rating(o.avgOverall)} hint="Verified reviews only" />
            <StatCard label="Saved by diners" value={o.favorites} hint={`${o.activeCampaigns} active campaign${o.activeCampaigns === 1 ? "" : "s"}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card className="p-5">
              <h2 className="sg-h3">Page views</h2>
              <ViewsChart data={o.dailyViews} />
            </Card>
            <Card className="p-5">
              <h2 className="sg-h3">Ratings and hygiene</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[14px]">
                <div><dt className="text-muted">Food</dt><dd className="font-display text-xl font-bold">{rating(o.avgFood)}</dd></div>
                <div><dt className="text-muted">Service</dt><dd className="font-display text-xl font-bold">{rating(o.avgService)}</dd></div>
                <div><dt className="text-muted">Cleanliness diners saw</dt><dd className="font-display text-xl font-bold">{rating(o.avgHygieneReported)}</dd></div>
                <div><dt className="text-muted">Unanswered reviews</dt><dd className="font-display text-xl font-bold">{o.unansweredReviews}</dd></div>
              </dl>
              <div className="mt-5 border-t border-line pt-4">
                <HygieneScoreRing score={o.hygieneScore} verified={o.hygieneVerified} size={88} />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="sg-h3">Latest reviews</h2>
                <Link to="/restaurant-dashboard/reviews" className="text-[14px] font-semibold text-brand hover:text-brand-strong">All reviews</Link>
              </div>
              <div className="mt-3 space-y-3">
                {o.recentReviews.length === 0 ? (
                  <EmptyState icon={MessageSquareText} title="No reviews yet" />
                ) : (
                  o.recentReviews.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} showStatus />)
                )}
              </div>
            </section>
            <section>
              <h2 className="sg-h3">Recent activity</h2>
              {o.recentActivity.length === 0 ? (
                <p className="mt-3 text-[14px] text-muted">Nothing yet.</p>
              ) : (
                <ol className="mt-3 divide-y divide-line rounded-card border border-line bg-canvas">
                  {o.recentActivity.map((a, i) => (
                    <li key={i} className="p-4">
                      <p className="text-[14.5px] font-semibold text-ink">
                        {a.link ? <Link to={a.link} className="hover:text-brand-strong">{a.title}</Link> : a.title}
                      </p>
                      {a.detail && <p className="mt-0.5 text-[13.5px] text-muted">{a.detail}</p>}
                      <p className="mt-0.5 text-[12.5px] text-muted">{timeAgo(a.at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ViewsChart({ data }: { data: OwnerOverview["dailyViews"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-4">
      <div aria-hidden="true" className="flex h-36 items-end gap-[3px]">
        {data.map((d) => (
          <div key={d.day} className="group relative flex-1">
            <div className="w-full rounded-t-[3px] bg-brand/80 transition-colors group-hover:bg-brand" style={{ height: `${Math.max(2, (d.count / max) * 136)}px` }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white group-hover:block">
              {formatDate(d.day)}: {d.count}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] text-muted" aria-hidden="true">
        <span>{formatDate(data[0]?.day)}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>Page views per day for the last 30 days</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ profile

export function OwnerProfilePage() {
  const [params] = useSearchParams();
  const { owner, current } = useCurrentRestaurant();
  const navigate = useNavigate();
  const toast = useToast();
  const creating = params.get("new") === "1" || (!owner.loading && !current);
  const id = current?.restaurant.id;
  const detail = useApi<RestaurantDetail>(!creating && id ? `owner:detail:${id}` : null, () => api.get(`/owner/restaurants/${id}`));

  if (owner.loading) return <LoadingState />;

  const create = async (body: RestaurantRequest) => {
    const { data, message } = await api.send<RestaurantDetail>("POST", "/restaurants", body);
    toast.success(message ?? "Restaurant saved");
    owner.reload();
    navigate(`/restaurant-dashboard?restaurant=${data.id}`);
  };
  const update = async (body: RestaurantRequest) => {
    const { data, message } = await api.send<RestaurantDetail>("PUT", `/restaurants/${id}`, body);
    detail.setData(data);
    owner.reload();
    toast.success(message ?? "Restaurant updated");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={creating ? "Add your restaurant" : "Restaurant profile"}
        description={
          creating
            ? "These details make up your public page. An admin approves new restaurants before they are listed."
            : "Changes appear on your public page straight away."
        }
      />
      {creating ? (
        <RestaurantForm onSubmit={create} submitLabel="Submit for approval" />
      ) : detail.loading && !detail.data ? (
        <LoadingState />
      ) : detail.error ? (
        <ErrorState message={detail.error} onRetry={detail.reload} />
      ) : detail.data ? (
        <RestaurantForm key={detail.data.id} initial={detail.data} onSubmit={update} submitLabel="Save changes" />
      ) : (
        <Navigate to="/restaurant-dashboard/profile?new=1" replace />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ reviews

type ReviewFilter = "ALL" | "UNANSWERED" | ReviewStatus;

export function OwnerReviewsPage() {
  const { current, placeholder } = useCurrentRestaurant();
  const id = current?.restaurant.id;
  const [filter, setFilter] = useState<ReviewFilter>("ALL");
  const [page, setPage] = useState(0);
  const list = useApi<Page<Review>>(id ? `owner:reviews:${id}:${filter}:${page}` : null, () =>
    api.get(`/owner/restaurants/${id}/reviews`, {
      status: filter === "ALL" || filter === "UNANSWERED" ? (filter === "UNANSWERED" ? "VERIFIED" : undefined) : filter,
      unanswered: filter === "UNANSWERED" || undefined,
      page,
      size: 10,
    }),
  );

  if (placeholder) return <div className="space-y-6"><PageHeader title="Reviews" />{placeholder}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Reply publicly to published reviews. You cannot edit, hide or remove reviews; if one looks fake, report it from your public page."
      />
      <Tabs
        label="Filter reviews"
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(0);
        }}
        tabs={[
          { value: "ALL", label: "All" },
          { value: "UNANSWERED", label: "Needs a reply" },
          { value: "VERIFIED", label: "Published" },
          { value: "PENDING", label: "In moderation" },
          { value: "FLAGGED", label: "Flagged" },
          { value: "REJECTED", label: "Rejected" },
        ]}
      />
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No reviews here" />
      ) : (
        <>
          <div className="space-y-4">
            {list.data?.content.map((r) => (
              <ReviewCard key={r.id} review={r} showStatus>
                {r.status === "VERIFIED" && (
                  <ResponseEditor
                    review={r}
                    onSaved={(updated) => list.setData((p) => ({ ...p!, content: p!.content.map((x) => (x.id === updated.id ? updated : x)) }))}
                  />
                )}
              </ReviewCard>
            ))}
          </div>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
}

function ResponseEditor({ review, onSaved }: { review: Review; onSaved: (r: Review) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(review.response?.body ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const updated = await api.put<Review>(`/owner/reviews/${review.id}/response`, { body: body.trim() });
      onSaved(updated);
      setOpen(false);
      toast.success("Response published");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      const updated = await api.del<Review>(`/owner/reviews/${review.id}/response`);
      onSaved(updated);
      setBody("");
      toast.success("Response removed");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <MessageSquareReply className="h-4 w-4" aria-hidden="true" /> {review.response ? "Edit reply" : "Reply publicly"}
        </Button>
        {review.response && (
          <Button variant="ghost" size="sm" onClick={remove} loading={busy}>
            Remove reply
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-control bg-surface p-4">
      <Field label="Your public reply" htmlFor={`resp-${review.id}`} hint="Shown under the review on your page. Keep it courteous and specific." required>
        <Textarea id={`resp-${review.id}`} rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save} loading={busy} disabled={!body.trim()}>
          Publish reply
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ hygiene

export function OwnerHygienePage() {
  const { current, placeholder } = useCurrentRestaurant();
  const id = current?.restaurant.id;
  const audits = useApi<Audit[]>(id ? `owner:hygiene:${id}` : null, () => api.get(`/owner/restaurants/${id}/hygiene`));
  const [openId, setOpenId] = useState<number | null>(null);

  if (placeholder) return <div className="space-y-6"><PageHeader title="Hygiene" />{placeholder}</div>;
  const h = current!.restaurant.hygiene;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hygiene"
        description="Your audited hygiene score, audit history, findings and recommendations. Audits are carried out by ServeGood reviewers and approved by an admin; they cannot be edited by restaurants."
      />
      <Card className="p-5">
        <HygieneScoreRing score={h.score} verified={h.verified} verifiedUntil={h.verifiedUntil} />
        {!h.verified && (
          <p className="mt-4 text-[14px] text-muted">
            {h.score === null
              ? "Your restaurant has not been audited yet. Once it is approved for listing, ServeGood schedules a reviewer visit."
              : "Your last audit has expired. ServeGood will schedule a new visit; you can also contact support to request one."}
          </p>
        )}
      </Card>

      <section>
        <h2 className="sg-h3">Audit history</h2>
        <div className="mt-3">
          {audits.loading && !audits.data ? (
            <LoadingState />
          ) : audits.error ? (
            <ErrorState message={audits.error} onRetry={audits.reload} />
          ) : audits.data && audits.data.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No audits yet" />
          ) : (
            <ul className="space-y-3">
              {audits.data?.map((a) => {
                const open = openId === a.id;
                return (
                  <li key={a.id} className="rounded-card border border-line bg-canvas">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : a.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
                    >
                      <span>
                        <span className="block text-[15px] font-semibold text-ink">Audit of {formatDate(a.auditDate)}</span>
                        <span className="text-[13.5px] text-muted">
                          {a.overallScore !== null ? `${a.overallScore}/100 · ${a.tier}` : "Not scored"}
                          {a.validUntil && a.status === "APPROVED" && ` · valid until ${formatDate(a.validUntil)}`}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-line p-4">
                        {a.status === "PENDING" && <Alert tone="info" className="mb-4">This audit is waiting for admin approval. Scores may still change.</Alert>}
                        <AuditBreakdown audit={a} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
