import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ClipboardCheck, ClipboardList, MessageSquareText, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { AuditBreakdown } from "@/components/app/AuditBreakdown";
import { ReviewCard } from "@/components/app/ReviewCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUpload } from "@/components/ui/ImageUpload";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  Tabs,
  Textarea,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/format";
import { tierForScore } from "@/lib/hygiene";
import { useToast } from "@/lib/toast";
import type { Assignment, Audit, AuditRequest, AuditStatus, Criterion, HygieneCategory, Page, Review, ReviewStatus, ReviewerOverview } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ overview

export function ReviewerOverviewPage() {
  const stats = useApi<ReviewerOverview>("reviewer:overview", () => api.get("/reviewer/overview"));
  const open = useApi<Page<Assignment>>("reviewer:assignments:preview", () => api.get("/reviewer/assignments", { open: true, size: 5 }));
  const s = stats.data;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Reviewer dashboard" title="Your audits and reviews" description="Visit assigned kitchens, score them on the checklist, and keep the review queue moving." />
      {stats.error ? (
        <ErrorState message={stats.error} onRetry={stats.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Open assignments" value={s?.openAssignments ?? "—"} to="/reviewer/assignments" />
          <StatCard label="Draft audits" value={s?.draftAudits ?? "—"} to="/reviewer/audits?status=DRAFT" />
          <StatCard label="Awaiting approval" value={s?.pendingAudits ?? "—"} to="/reviewer/audits?status=PENDING" />
          <StatCard label="Approved audits" value={s?.approvedAudits ?? "—"} to="/reviewer/audits?status=APPROVED" />
          <StatCard label="Reviews written" value={s?.reviewsWritten ?? "—"} />
        </div>
      )}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="sg-h3">Next visits</h2>
          <Link to="/reviewer/assignments" className="text-[14px] font-semibold text-brand hover:text-brand-strong">All assignments</Link>
        </div>
        <div className="mt-3">
          {open.data && open.data.content.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No open assignments">An admin will assign kitchens to you. You will get a notification.</EmptyState>
          ) : (
            <AssignmentList items={open.data?.content ?? []} />
          )}
        </div>
      </section>
    </div>
  );
}

function AssignmentList({ items, onStatus }: { items: Assignment[]; onStatus?: (a: Assignment) => void }) {
  return (
    <ul className="space-y-3">
      {items.map((a) => {
        const overdue = a.dueDate && a.dueDate < todayIso() && (a.status === "ASSIGNED" || a.status === "IN_PROGRESS");
        return (
          <li key={a.id} className="rounded-card border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15.5px] font-semibold text-ink">
                  <Link to={`/restaurants/${a.restaurantId}`} className="hover:text-brand-strong">{a.restaurantName}</Link>
                </p>
                <p className="text-[13.5px] text-muted">
                  {a.locality}
                  {a.dueDate && <span className={overdue ? "font-semibold text-alert" : undefined}> · due {formatDate(a.dueDate)}{overdue ? " (overdue)" : ""}</span>}
                </p>
                {a.notes && <p className="mt-1 text-[13.5px] text-ink">{a.notes}</p>}
              </div>
              <StatusBadge status={a.status} />
            </div>
            {(a.status === "ASSIGNED" || a.status === "IN_PROGRESS") && (
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink size="sm" to={`/reviewer/audits/new?restaurant=${a.restaurantId}&assignment=${a.id}`}>
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Start audit
                </ButtonLink>
                <ButtonLink size="sm" variant="secondary" to={`/restaurants/${a.restaurantId}#reviews`}>
                  Write a review
                </ButtonLink>
                {a.status === "ASSIGNED" && onStatus && (
                  <Button size="sm" variant="ghost" onClick={() => onStatus(a)}>Mark in progress</Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------ assignments

export function ReviewerAssignmentsPage() {
  const toast = useToast();
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(0);
  const list = useApi<Page<Assignment>>(`reviewer:assignments:${open}:${page}`, () => api.get("/reviewer/assignments", { open, page, size: 20 }));

  const markInProgress = async (a: Assignment) => {
    try {
      const updated = await api.patch<Assignment>(`/reviewer/assignments/${a.id}/status`, { status: "IN_PROGRESS" });
      list.setData((p) => ({ ...p!, content: p!.content.map((x) => (x.id === a.id ? updated : x)) }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Assignments" description="Kitchens an admin has asked you to audit. Your review of an assigned restaurant is published as an audited visit." />
      <Tabs
        label="Assignment filter"
        value={open ? "open" : "all"}
        onChange={(v) => {
          setOpen(v === "open");
          setPage(0);
        }}
        tabs={[
          { value: "open", label: "Open" },
          { value: "all", label: "All" },
        ]}
      />
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing assigned" />
      ) : (
        <>
          <AssignmentList items={list.data?.content ?? []} onStatus={markInProgress} />
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ audits list

export function ReviewerAuditsPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as AuditStatus | null) ?? null;
  const [page, setPage] = useState(0);
  const list = useApi<Page<Audit>>(`reviewer:audits:${status}:${page}`, () => api.get("/reviewer/audits", { status: status ?? undefined, page, size: 10 }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hygiene audits"
        description="Drafts are private to you. Submitted audits go to an admin for approval."
        actions={<ButtonLink to="/reviewer/assignments"><Plus className="h-4 w-4" aria-hidden="true" /> Start from an assignment</ButtonLink>}
      />
      <Tabs
        label="Audit status"
        value={status ?? "ALL"}
        onChange={(v) => {
          setPage(0);
          setParams(v === "ALL" ? {} : { status: v });
        }}
        tabs={[
          { value: "ALL", label: "All" },
          { value: "DRAFT", label: "Drafts" },
          { value: "PENDING", label: "Awaiting approval" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Sent back" },
          { value: "EXPIRED", label: "Expired" },
        ]}
      />
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No audits here" />
      ) : (
        <>
          <ul className="space-y-3">
            {list.data?.content.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-canvas p-4">
                <div>
                  <p className="text-[15.5px] font-semibold text-ink">{a.restaurantName}</p>
                  <p className="text-[13.5px] text-muted">
                    Visit {formatDate(a.auditDate)} · {a.overallScore !== null ? `${a.overallScore}/100 (${a.tier})` : "not scored yet"}
                  </p>
                  {a.status === "REJECTED" && a.decisionNote && <p className="mt-1 text-[13.5px] text-alert">Admin: {a.decisionNote}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  <ButtonLink size="sm" variant="secondary" to={`/reviewer/audits/${a.id}`}>
                    {a.status === "DRAFT" || a.status === "REJECTED" ? <><Pencil className="h-4 w-4" aria-hidden="true" /> Continue</> : "View"}
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ audit editor

type ItemState = Record<HygieneCategory, { score: number | null; notes: string }>;

export function AuditEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = !id;
  const audit = useApi<Audit>(!isNew ? `reviewer:audit:${id}` : null, () => api.get(`/reviewer/audits/${id}`));
  const criteria = useApi<Criterion[]>("hygiene:criteria", () => api.get("/hygiene/criteria"));

  if ((!isNew && audit.loading && !audit.data) || (criteria.loading && !criteria.data)) return <LoadingState label="Loading audit" />;
  if (audit.error) return <ErrorState message={audit.error} onRetry={audit.reload} />;
  if (criteria.error || !criteria.data) return <ErrorState message={criteria.error ?? "Could not load the checklist"} onRetry={criteria.reload} />;

  const a = audit.data;
  if (a && a.status !== "DRAFT" && a.status !== "REJECTED") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Hygiene audit" title={a.restaurantName} description={`Visit on ${formatDate(a.auditDate)}`} actions={<StatusBadge status={a.status} />} />
        {a.decisionNote && <Alert tone="info" title="Admin note">{a.decisionNote}</Alert>}
        <Card className="p-5">
          <p className="font-display text-3xl font-bold">{a.overallScore}/100 <span className="text-[15px] font-semibold text-muted">{a.tier}</span></p>
          <div className="mt-4"><AuditBreakdown audit={a} /></div>
        </Card>
      </div>
    );
  }

  return (
    <AuditEditor
      key={a?.id ?? "new"}
      audit={a}
      criteria={criteria.data}
      restaurantId={a?.restaurantId ?? Number(params.get("restaurant"))}
      assignmentId={a?.assignmentId ?? (params.get("assignment") ? Number(params.get("assignment")) : null)}
    />
  );
}

function AuditEditor({
  audit,
  criteria,
  restaurantId,
  assignmentId,
}: {
  audit: Audit | null;
  criteria: Criterion[];
  restaurantId: number;
  assignmentId: number | null;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [auditDate, setAuditDate] = useState(audit?.auditDate ?? todayIso());
  const [items, setItems] = useState<ItemState>(() => {
    const init = {} as ItemState;
    criteria.forEach((c) => {
      const existing = audit?.items.find((i) => i.category === c.category);
      init[c.category] = { score: existing?.score ?? null, notes: existing?.notes ?? "" };
    });
    return init;
  });
  const [findings, setFindings] = useState(audit?.findings ?? "");
  const [recommendations, setRecommendations] = useState(audit?.recommendations ?? "");
  const [evidence, setEvidence] = useState<{ url: string; caption: string; category: HygieneCategory | null }[]>(
    audit?.evidence.map((e) => ({ url: e.url, caption: e.caption ?? "", category: e.category })) ?? [],
  );
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Live preview using the same weighted formula as the server.
  const preview = useMemo(() => {
    const scored = criteria.filter((c) => items[c.category].score !== null);
    if (!scored.length) return null;
    const total = scored.reduce((sum, c) => sum + ((items[c.category].score ?? 0) / 10) * c.weight, 0);
    const weights = scored.reduce((sum, c) => sum + c.weight, 0);
    return Math.round((total * 100) / weights);
  }, [criteria, items]);
  const complete = criteria.every((c) => items[c.category].score !== null);
  const tier = tierForScore(preview);

  if (!restaurantId) {
    return <Alert tone="warning">Start an audit from one of your assignments.</Alert>;
  }

  const body = (): AuditRequest => ({
    restaurantId,
    assignmentId,
    auditDate,
    items: criteria
      .filter((c) => items[c.category].score !== null)
      .map((c) => ({ category: c.category, score: items[c.category].score!, notes: items[c.category].notes.trim() || null })),
    findings: findings.trim() || null,
    recommendations: recommendations.trim() || null,
    evidence: evidence.map((e) => ({ url: e.url, caption: e.caption.trim() || null, category: e.category })),
  });

  const save = async (andSubmit: boolean) => {
    setError(null);
    if (andSubmit && !complete) return setError("Score every category before submitting.");
    if (andSubmit && !findings.trim()) return setError("Add your findings before submitting.");
    setBusy(andSubmit ? "submit" : "save");
    try {
      let saved = audit
        ? await api.put<Audit>(`/reviewer/audits/${audit.id}`, body())
        : await api.post<Audit>("/reviewer/audits", body());
      if (andSubmit) {
        saved = await api.post<Audit>(`/reviewer/audits/${saved.id}/submit`);
        toast.success("Audit submitted for approval");
        navigate("/reviewer/audits?status=PENDING");
      } else {
        toast.success("Draft saved");
        if (!audit) navigate(`/reviewer/audits/${saved.id}`, { replace: true });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hygiene audit"
        title={audit ? audit.restaurantName : "New audit"}
        description="Score each area from 0 (serious problems) to 10 (exemplary). The overall score is weighted and calculated for you."
        actions={audit && <StatusBadge status={audit.status} />}
      />
      {audit?.status === "REJECTED" && audit.decisionNote && (
        <Alert tone="warning" title="Sent back by an admin">{audit.decisionNote} Saving will return it to draft so you can resubmit.</Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <Card className="sticky top-[72px] z-20 flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <p className="font-display text-3xl font-bold tabular-nums">{preview ?? "—"}<span className="text-[14px] font-normal text-muted">/100</span></p>
          <p className={cn("text-[14px] font-semibold", tier === "verified" ? "text-brand-strong" : tier === "standard" ? "text-caution" : tier === "attention" ? "text-alert" : "text-muted")}>
            {tier === "verified" ? "Verified Clean" : tier === "standard" ? "Standard Good" : tier === "attention" ? "Needs Attention" : "Not scored"}
            {!complete && preview !== null && <span className="block text-[12.5px] font-normal text-muted">Partial: {criteria.filter((c) => items[c.category].score === null).length} left</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => save(false)} loading={busy === "save"} disabled={busy !== null}>Save draft</Button>
          <Button onClick={() => save(true)} loading={busy === "submit"} disabled={busy !== null}>
            <Send className="h-4 w-4" aria-hidden="true" /> Submit for approval
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <Field label="Date of visit" htmlFor="a-date" required>
          <Input id="a-date" type="date" max={todayIso()} value={auditDate} onChange={(e) => setAuditDate(e.target.value)} className="max-w-xs" />
        </Field>
      </Card>

      <section className="space-y-3" aria-label="Checklist">
        {criteria.map((c) => {
          const state = items[c.category];
          return (
            <Card key={c.category} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">{c.label}</h2>
                  <p className="text-[13px] text-muted">Weight {c.weight}% of the overall score</p>
                </div>
                <div role="radiogroup" aria-label={`${c.label} score`} className="flex flex-wrap gap-1">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={state.score === n}
                      onClick={() => setItems((s) => ({ ...s, [c.category]: { ...s[c.category], score: n } }))}
                      className={cn(
                        "h-9 w-9 rounded-control border text-[13.5px] font-semibold tabular-nums transition-colors",
                        state.score === n ? "border-brand bg-brand text-white" : "border-line bg-canvas text-ink hover:border-control",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Notes" htmlFor={`n-${c.category}`} className="mt-3">
                <Textarea id={`n-${c.category}`} rows={2} value={state.notes} onChange={(e) => setItems((s) => ({ ...s, [c.category]: { ...s[c.category], notes: e.target.value } }))} />
              </Field>
            </Card>
          );
        })}
      </section>

      <Card className="space-y-4 p-5">
        <Field label="Findings" htmlFor="a-findings" hint="What you observed. Published on the restaurant's page once approved." required>
          <Textarea id="a-findings" rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} />
        </Field>
        <Field label="Recommendations" htmlFor="a-recs" hint="What the kitchen should fix or keep doing.">
          <Textarea id="a-recs" rows={3} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
        </Field>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="sg-h3">Evidence</h2>
        <p className="text-[13.5px] text-muted">Photos taken during the visit. Avoid photographing people.</p>
        <ImageUpload
          purpose="HYGIENE_EVIDENCE"
          value={evidence.map((e) => e.url)}
          onChange={(urls) => setEvidence((list) => urls.map((url) => list.find((e) => e.url === url) ?? { url, caption: "", category: null }))}
          max={20}
        />
        {evidence.length > 0 && (
          <ul className="space-y-2">
            {evidence.map((e, i) => (
              <li key={e.url} className="flex flex-wrap items-center gap-2">
                <img src={e.url} alt="" className="h-10 w-10 rounded object-cover" />
                <Input aria-label={`Caption for photo ${i + 1}`} placeholder="Caption" value={e.caption} onChange={(ev) => setEvidence((l) => l.map((x, j) => (j === i ? { ...x, caption: ev.target.value } : x)))} className="min-w-0 flex-1" />
                <Select aria-label={`Area for photo ${i + 1}`} value={e.category ?? ""} onChange={(ev) => setEvidence((l) => l.map((x, j) => (j === i ? { ...x, category: (ev.target.value || null) as HygieneCategory | null } : x)))} className="w-56">
                  <option value="">General</option>
                  {criteria.map((c) => <option key={c.category} value={c.category}>{c.label}</option>)}
                </Select>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {audit?.status === "DRAFT" && (
        <Button variant="ghost" onClick={() => setDeleting(true)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete draft
        </Button>
      )}
      <ConfirmDialog
        open={deleting}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        tone="danger"
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          try {
            await api.del(`/reviewer/audits/${audit!.id}`);
            navigate("/reviewer/audits");
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ moderation

export function ReviewerModerationPage() {
  return <ModerationPage scope="reviewer" />;
}

export function AdminModerationPage() {
  return <ModerationPage scope="admin" />;
}

export function ModerationPage({ scope = "reviewer" }: { scope?: "reviewer" | "admin" }) {
  const toast = useToast();
  const [status, setStatus] = useState<ReviewStatus>("PENDING");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const list = useApi<Page<Review>>(`${scope}:moderation:${status}:${page}:${query}`, () =>
    api.get(`/${scope}/reviews`, { status, page, size: 10, q: query || undefined }),
  );
  const [deciding, setDeciding] = useState<{ review: Review; status: ReviewStatus } | null>(null);

  const decide = async (review: Review, next: ReviewStatus, note: string) => {
    try {
      const { message } = await api.send<Review>("PATCH", `/${scope}/reviews/${review.id}/moderation`, { status: next, note: note || null });
      list.setData((p) => ({ ...p!, content: p!.content.filter((r) => r.id !== review.id), totalElements: p!.totalElements - 1 }));
      toast.success(message ?? "Decision saved");
      setDeciding(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Review moderation" description="Publish genuine reviews; reject or flag ones that break the rules. Only verified reviews count towards ratings." />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          label="Review status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          tabs={[
            { value: "PENDING", label: "Pending" },
            { value: "FLAGGED", label: "Flagged" },
            { value: "VERIFIED", label: "Published" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
            setPage(0);
          }}
          className="flex gap-2"
        >
          <Input aria-label="Search reviews" placeholder="Search text or restaurant" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-9 w-56 py-1" />
          <Button type="submit" size="sm" variant="secondary">Search</Button>
        </form>
      </div>
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="Queue is clear" />
      ) : (
        <>
          <div className="space-y-4">
            {list.data?.content.map((r) => (
              <ReviewCard key={r.id} review={r} showStatus showRestaurant>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {r.status !== "VERIFIED" && <Button size="sm" onClick={() => decide(r, "VERIFIED", "")}>Publish</Button>}
                  {r.status !== "REJECTED" && <Button size="sm" variant="secondary" onClick={() => setDeciding({ review: r, status: "REJECTED" })}>Reject</Button>}
                  {r.status !== "FLAGGED" && <Button size="sm" variant="ghost" onClick={() => setDeciding({ review: r, status: "FLAGGED" })}>Flag</Button>}
                  <Link to={`/restaurants/${r.restaurantId}`} className="ml-auto inline-flex min-h-9 items-center text-[14px] font-semibold text-brand">Restaurant</Link>
                </div>
              </ReviewCard>
            ))}
          </div>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={setPage} />}
        </>
      )}
      <ConfirmDialog
        open={!!deciding}
        title={deciding?.status === "REJECTED" ? "Reject this review?" : "Flag this review?"}
        confirmLabel={deciding?.status === "REJECTED" ? "Reject" : "Flag"}
        tone={deciding?.status === "REJECTED" ? "danger" : "primary"}
        reasonLabel="Note to the author"
        onClose={() => setDeciding(null)}
        onConfirm={(note) => (deciding ? decide(deciding.review, deciding.status, note) : undefined)}
      >
        The author is notified with your note. {deciding?.status === "FLAGGED" ? "Flagged reviews are hidden while they are looked at." : "They can edit the review and resubmit."}
      </ConfirmDialog>
    </div>
  );
}
