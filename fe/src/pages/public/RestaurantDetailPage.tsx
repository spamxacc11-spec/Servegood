import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  Clock,
  Flag,
  Globe,
  Leaf,
  Mail,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Pencil,
  Phone,
  ShieldCheck,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { AuditBreakdown } from "@/components/app/AuditBreakdown";
import { DeliveryComparisonView } from "@/components/app/DeliveryComparisonView";
import { FavoriteButton } from "@/components/app/FavoriteButton";
import { HygieneChip, HygieneScoreRing } from "@/components/app/HygieneScore";
import { ReportDialog } from "@/components/app/ReportDialog";
import { ReviewCard } from "@/components/app/ReviewCard";
import { ReviewForm } from "@/components/app/ReviewForm";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  Select,
  Stars,
  StatusBadge,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DAY_NAMES, formatDate, priceLevel, rating, rupees } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type {
  DeliveryComparison,
  Menu,
  Page,
  PublicHygiene,
  RestaurantDetail,
  Review,
  ReviewRequest,
} from "@/lib/types";
import { useApi } from "@/lib/useApi";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "prices", label: "Prices" },
  { id: "hygiene", label: "Hygiene" },
  { id: "menu", label: "Menu" },
  { id: "reviews", label: "Reviews" },
  { id: "info", label: "Info" },
];

export function RestaurantDetailPage() {
  const { id = "" } = useParams();
  const detail = useApi<RestaurantDetail>(`restaurant:${id}`, () => api.get(`/restaurants/${id}`));
  const r = detail.data;
  const rid = r?.id;
  const delivery = useApi<DeliveryComparison>(rid && r?.status === "APPROVED" ? `delivery:${rid}` : null, () => api.get(`/restaurants/${rid}/delivery-options`));
  const hygiene = useApi<PublicHygiene>(rid && r?.status === "APPROVED" ? `hygiene:${rid}` : null, () => api.get(`/restaurants/${rid}/hygiene`));
  const menu = useApi<Menu[]>(rid && r?.status === "APPROVED" ? `menu:${rid}` : null, () => api.get(`/restaurants/${rid}/menu`));
  const [report, setReport] = useState<{ reviewId?: number; type?: "INCORRECT_HYGIENE_INFO" } | null>(null);

  if (detail.loading && !r) {
    return (
      <div className="sg-container py-12">
        <LoadingState label="Loading restaurant" rows={4} />
      </div>
    );
  }
  if (detail.error || !r) {
    return (
      <div className="sg-container py-12">
        <ErrorState message={detail.error ?? "Restaurant not found"} onRetry={detail.reload} />
        <Link to="/restaurants" className="mt-4 inline-flex font-semibold text-brand">
          Back to restaurants
        </Link>
      </div>
    );
  }

  const cuisines = r.categories.filter((c) => c.kind === "CUISINE");
  const styles = r.categories.filter((c) => c.kind === "DINING_STYLE");
  const gallery = r.images.length ? r.images : r.coverImageUrl ? [{ id: null, url: r.coverImageUrl, altText: r.name, sortOrder: 0 }] : [];
  const allItems = (menu.data ?? []).flatMap((m) => m.items);
  const mapsUrl =
    r.address?.latitude && r.address?.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${r.address.latitude},${r.address.longitude}`
      : r.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${r.address.line1}, ${r.address.locality}, ${r.address.city}`)}`
        : null;

  return (
    <>
      {r.status !== "APPROVED" && (
        <div className="sg-container pt-6">
          <Alert tone="warning" title="Not publicly listed">
            Only you can see this page. Status: <StatusBadge status={r.status} />
          </Alert>
        </div>
      )}

      {/* ---------------------------------------------------------------- hero */}
      <section id="overview" className="border-b border-line">
        <div className="sg-container grid gap-8 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12 lg:py-12">
          <div>
            {gallery.length > 0 ? (
              <div className="grid gap-2">
                <img
                  src={gallery[0].url}
                  alt={gallery[0].altText ?? r.name}
                  width={800}
                  height={600}
                  className="aspect-4/3 w-full rounded-card border border-line object-cover"
                />
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.slice(1, 5).map((img, i) => (
                      <img key={img.url + i} src={img.url} alt={img.altText ?? ""} loading="lazy" className="aspect-square w-full rounded-control border border-line object-cover" />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-4/3 items-center justify-center rounded-card border border-line bg-surface text-control">
                <UtensilsCrossed className="h-12 w-12" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="sg-eyebrow text-brand">{[...cuisines, ...styles].map((c) => c.name).join(" · ") || "Restaurant"}</p>
            <h1 className="sg-h1 mt-2">{r.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted">
              {r.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {r.address.locality}, {r.address.city}
                </span>
              )}
              <span>{priceLevel(r.priceLevel)}</span>
              {r.costForTwo && <span>{rupees(r.costForTwo)} for two</span>}
              {r.openNow !== null && (
                <span className={r.openNow ? "inline-flex items-center gap-1 font-semibold text-brand-strong" : "inline-flex items-center gap-1"}>
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {r.openNow ? "Open now" : "Closed now"}
                </span>
              )}
            </p>

            {r.description && <p className="sg-lede mt-4 text-ink">{r.description}</p>}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <p className="sg-eyebrow">Diner rating</p>
                {r.ratings.reviewCount > 0 ? (
                  <>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold text-ink">{rating(r.ratings.overall)}</span>
                      <Stars value={r.ratings.overall} size="md" />
                    </p>
                    <p className="text-[13px] text-muted">
                      From {r.ratings.reviewCount} verified review{r.ratings.reviewCount === 1 ? "" : "s"}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[14px] text-muted">No verified reviews yet</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="sg-eyebrow">Audited hygiene</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-ink">{r.hygiene.score ?? "—"}</span>
                  {r.hygiene.score !== null && <span className="text-[13px] text-muted">/ 100</span>}
                </p>
                <div className="mt-1">
                  <HygieneChip hygiene={r.hygiene} />
                </div>
              </Card>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              Diner ratings and the hygiene score are kept separate. Neither can be bought.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <a href="#reviews" className="sg-btn sg-btn-primary">
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" /> Write a review
              </a>
              <FavoriteButton restaurantId={r.id} initial={r.favorite} variant="button" />
              <Button variant="ghost" onClick={() => setReport({})}>
                <Flag className="h-4 w-4" aria-hidden="true" /> Report a problem
              </Button>
            </div>
          </div>
        </div>

        <nav aria-label="On this page" className="sticky top-[68px] z-30 border-t border-line bg-canvas/95 backdrop-blur">
          <div className="sg-container flex gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-11 shrink-0 items-center px-3 text-[14.5px] font-semibold text-muted hover:text-ink">
                {s.label}
              </a>
            ))}
          </div>
        </nav>
      </section>

      <div className="sg-container space-y-16 py-12 lg:py-16">
        {/* ---------------------------------------------------------------- prices */}
        <section id="prices" aria-labelledby="prices-h">
          <h2 id="prices-h" className="sg-h2">
            Where it costs <span className="text-brand">least to order</span>
          </h2>
          <div className="mt-6 max-w-3xl">
            {delivery.loading && !delivery.data ? (
              <LoadingState label="Loading prices" rows={3} />
            ) : delivery.error ? (
              <ErrorState message={delivery.error} onRetry={delivery.reload} />
            ) : delivery.data ? (
              <DeliveryComparisonView data={delivery.data} />
            ) : null}
          </div>
        </section>

        {/* ---------------------------------------------------------------- hygiene */}
        <section id="hygiene" aria-labelledby="hygiene-h" className="rounded-card border border-line bg-surface p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 id="hygiene-h" className="sg-h2">
              Hygiene audit
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setReport({ type: "INCORRECT_HYGIENE_INFO" })}>
              <Flag className="h-4 w-4" aria-hidden="true" /> Report hygiene information
            </Button>
          </div>
          {hygiene.loading && !hygiene.data ? (
            <LoadingState label="Loading audit" rows={2} />
          ) : hygiene.error ? (
            <ErrorState message={hygiene.error} onRetry={hygiene.reload} />
          ) : hygiene.data ? (
            <div className="mt-6">
              <HygieneScoreRing score={hygiene.data.score} verified={hygiene.data.verified} verifiedUntil={hygiene.data.verifiedUntil} />
              {hygiene.data.latestAudit ? (
                <div className="mt-6 rounded-card border border-line bg-canvas p-5">
                  <AuditBreakdown audit={hygiene.data.latestAudit} />
                </div>
              ) : (
                <p className="mt-4 max-w-[62ch] text-[14.5px] text-muted">
                  No approved audit yet. ServeGood reviewers visit kitchens in person and score eight areas, from food storage to pest control. Until then
                  this restaurant is shown as &ldquo;Not yet audited&rdquo;.
                </p>
              )}
              {hygiene.data.history.length > 1 && (
                <div className="mt-6">
                  <p className="sg-eyebrow">Audit history</p>
                  <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-canvas">
                    {hygiene.data.history.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                        <span>{formatDate(h.auditDate)}</span>
                        <span className="flex items-center gap-3">
                          <span className="font-semibold tabular-nums">{h.score}/100</span>
                          <StatusBadge status={h.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-5 flex gap-2 text-[13px] text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                ServeGood&rsquo;s own audit framework. Not a government food safety rating and not a health guarantee.
              </p>
            </div>
          ) : null}
        </section>

        {/* ---------------------------------------------------------------- menu */}
        <section id="menu" aria-labelledby="menu-h">
          <h2 id="menu-h" className="sg-h2">
            Menu
          </h2>
          <div className="mt-6">
            {menu.loading && !menu.data ? (
              <LoadingState label="Loading menu" rows={3} />
            ) : menu.error ? (
              <ErrorState message={menu.error} onRetry={menu.reload} />
            ) : menu.data && menu.data.every((m) => m.items.length === 0) ? (
              <EmptyState icon={UtensilsCrossed} title="Menu not published yet" />
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {menu.data?.filter((m) => m.items.length).map((m) => (
                  <div key={m.id}>
                    <h3 className="sg-h3 border-b border-line pb-2">{m.name}</h3>
                    {m.description && <p className="mt-1 text-[13.5px] text-muted">{m.description}</p>}
                    <ul className="mt-2 divide-y divide-line">
                      {m.items.map((i) => (
                        <li key={i.id} className="flex gap-3 py-3">
                          {i.imageUrl && <img src={i.imageUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-control object-cover" />}
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                              {i.vegetarian && <Leaf className="h-4 w-4 text-brand" aria-label="Vegetarian" />}
                              {i.name}
                            </p>
                            {i.description && <p className="mt-0.5 text-[13.5px] text-muted">{i.description}</p>}
                            {!i.available && <p className="mt-0.5 text-[12.5px] font-semibold text-caution">Currently unavailable</p>}
                          </div>
                          <p className="shrink-0 text-[15px] font-semibold text-ink tabular-nums">{rupees(i.price)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[13px] text-muted">Menu prices as listed by the restaurant. Delivery platforms may charge differently.</p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- reviews */}
        <ReviewsSection restaurant={r} menuItems={allItems} onReport={(reviewId) => setReport({ reviewId })} onChanged={detail.reload} />

        {/* ---------------------------------------------------------------- info */}
        <section id="info" aria-labelledby="info-h" className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 id="info-h" className="sg-h2">
              Location and contact
            </h2>
            {r.address && (
              <address className="mt-4 text-[15px] leading-relaxed text-ink not-italic">
                {r.address.line1}
                {r.address.line2 && <>, {r.address.line2}</>}
                <br />
                {r.address.locality}, {r.address.city} {r.address.postalCode}
                <br />
                {r.address.state}, {r.address.country ?? "India"}
              </address>
            )}
            <ul className="mt-4 space-y-1 text-[15px]">
              {mapsUrl && (
                <li>
                  <a href={mapsUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:text-brand-strong">
                    <Navigation className="h-4 w-4" aria-hidden="true" /> Open in Google Maps
                  </a>
                </li>
              )}
              {r.phone && (
                <li>
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-2 text-ink hover:text-brand-strong">
                    <Phone className="h-4 w-4 text-muted" aria-hidden="true" /> {r.phone}
                  </a>
                </li>
              )}
              {r.email && (
                <li>
                  <a href={`mailto:${r.email}`} className="inline-flex min-h-11 items-center gap-2 text-ink hover:text-brand-strong">
                    <Mail className="h-4 w-4 text-muted" aria-hidden="true" /> {r.email}
                  </a>
                </li>
              )}
              {r.website && (
                <li>
                  <a href={r.website} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-2 text-ink hover:text-brand-strong">
                    <Globe className="h-4 w-4 text-muted" aria-hidden="true" /> Website
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="sg-h2">Opening hours</h2>
            {r.openingHours.length === 0 ? (
              <p className="mt-4 text-[15px] text-muted">Hours not listed.</p>
            ) : (
              <table className="mt-4 w-full max-w-sm text-[15px]">
                <caption className="sr-only">Opening hours</caption>
                <tbody>
                  {DAY_NAMES.map((day, i) => {
                    const slots = r.openingHours.filter((h) => h.dayOfWeek === i + 1);
                    const today = (new Date().getDay() + 6) % 7 === i;
                    return (
                      <tr key={day} className={today ? "font-semibold text-ink" : "text-ink"}>
                        <th scope="row" className="py-1.5 pr-6 text-left font-normal">
                          {day}
                          {today && <span className="sr-only"> (today)</span>}
                        </th>
                        <td className="py-1.5 tabular-nums">{slots.length ? slots.map((s) => `${s.opensAt}–${s.closesAt}`).join(", ") : "Closed"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {report && (
        <ReportDialog open onClose={() => setReport(null)} restaurantId={r.id} reviewId={report.reviewId} defaultType={report.type} />
      )}
    </>
  );
}

function ReviewsSection({
  restaurant: r,
  menuItems,
  onReport,
  onChanged,
}: {
  restaurant: RestaurantDetail;
  menuItems: Menu["items"];
  onReport: (reviewId: number) => void;
  onChanged: () => void;
}) {
  const { status, user, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [sort, setSort] = useState<"NEWEST" | "HIGHEST" | "LOWEST">("NEWEST");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const list = useApi<Page<Review>>(`reviews:${r.id}:${sort}:${page}`, () => api.get(`/restaurants/${r.id}/reviews`, { sort, page, size: 8 }));
  const mine = useApi<Review | null>(status === "authenticated" ? `myreview:${r.id}:${user?.id}` : null, () => api.get(`/me/reviews/restaurant/${r.id}`));

  const canReview = status === "authenticated" && hasRole("CONSUMER", "REVIEWER");
  const total = Object.values(r.ratingDistribution).reduce((a, b) => a + b, 0);

  const submit = async (body: ReviewRequest) => {
    const res = mine.data
      ? await api.send<Review>("PUT", `/reviews/${mine.data.id}`, body)
      : await api.send<Review>("POST", `/restaurants/${r.id}/reviews`, body);
    toast.success(res.message ?? "Review saved");
    mine.setData(res.data);
    setEditing(false);
    list.reload();
    onChanged();
  };

  return (
    <section id="reviews" aria-labelledby="reviews-h">
      <h2 id="reviews-h" className="sg-h2">
        Verified reviews
      </h2>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
        <div>
          <Card className="p-5">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold text-ink">{rating(r.ratings.overall)}</span>
              <span className="text-[14px] text-muted">out of 5</span>
            </p>
            <Stars value={r.ratings.overall} size="md" />
            <p className="mt-1 text-[13px] text-muted">{r.ratings.reviewCount} verified review{r.ratings.reviewCount === 1 ? "" : "s"}</p>
            <ul className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const n = r.ratingDistribution[s] ?? 0;
                return (
                  <li key={s} className="flex items-center gap-2 text-[13px]">
                    <span className="inline-flex w-8 items-center gap-0.5 text-muted">
                      {s} <Star className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <span className="block h-full bg-caution" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                    </span>
                    <span className="w-6 text-right text-muted tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-muted">Food</dt>
                <dd className="font-semibold">{rating(r.ratings.food)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Service</dt>
                <dd className="font-semibold">{rating(r.ratings.service)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Cleanliness diners saw</dt>
                <dd className="font-semibold">{rating(r.ratings.hygieneReported)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[12.5px] text-muted">
              Only reviews that pass moderation count. Sponsored placement never changes these numbers.
            </p>
          </Card>
        </div>

        <div className="min-w-0">
          {/* Write / edit */}
          <Card className="mb-6 p-5">
            {status !== "authenticated" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[15px] text-ink">Ordered or eaten here? Share what it was like.</p>
                <Button onClick={() => navigate(`/login?next=${encodeURIComponent(location.pathname + "#reviews")}`)}>Sign in to review</Button>
              </div>
            ) : !canReview ? (
              <p className="text-[14.5px] text-muted">Reviews are written from diner accounts.</p>
            ) : mine.data && !editing ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="sg-h3">Your review</p>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Button>
                </div>
                {mine.data.status !== "VERIFIED" && (
                  <p className="mt-2 text-[13.5px] text-muted">
                    Status: <StatusBadge status={mine.data.status} />{" "}
                    {mine.data.status === "PENDING" && "It will appear here once a moderator approves it."}
                  </p>
                )}
                <div className="mt-3">
                  <ReviewCard review={mine.data} showStatus />
                </div>
              </div>
            ) : editing || !mine.loading ? (
              <div>
                <p className="sg-h3">{mine.data ? "Edit your review" : "Write a review"}</p>
                <p className="mt-1 text-[13.5px] text-muted">
                  Reviews are checked by a moderator before they are published{mine.data ? "; editing sends yours back for a quick check" : ""}.
                </p>
                <div className="mt-4">
                  <ReviewForm
                    initial={mine.data}
                    menuItems={menuItems}
                    onSubmit={submit}
                    onCancel={mine.data ? () => setEditing(false) : undefined}
                    submitLabel={mine.data ? "Save changes" : "Submit review"}
                  />
                </div>
              </div>
            ) : null}
          </Card>

          <div className="flex items-center justify-end">
            <label htmlFor="rv-sort" className="sr-only">
              Sort reviews
            </label>
            <Select
              id="rv-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setPage(0);
              }}
              className="min-h-9 w-auto py-1 text-[14px]"
            >
              <option value="NEWEST">Newest first</option>
              <option value="HIGHEST">Highest rated</option>
              <option value="LOWEST">Lowest rated</option>
            </Select>
          </div>

          <div className="mt-4 space-y-4">
            {list.loading && !list.data ? (
              <LoadingState label="Loading reviews" />
            ) : list.error ? (
              <ErrorState message={list.error} onRetry={list.reload} />
            ) : list.data && list.data.content.length === 0 ? (
              <EmptyState icon={MessageSquarePlus} title="No verified reviews yet">
                Be the first to review {r.name}.
              </EmptyState>
            ) : (
              list.data?.content.map((rv) => (
                <ReviewCard
                  key={rv.id}
                  review={rv}
                  actions={
                    status === "authenticated" && rv.authorId !== user?.id ? (
                      <Button variant="ghost" size="sm" onClick={() => onReport(rv.id)} aria-label="Report this review">
                        <Flag className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : undefined
                  }
                />
              ))
            )}
          </div>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
        </div>
      </div>
    </section>
  );
}
