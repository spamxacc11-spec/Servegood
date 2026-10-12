import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Check, Flag, Megaphone, Pencil, Plus, ScrollText, Send, Tags, Trash2, Truck, X } from "lucide-react";
import { DeliveryManager } from "@/components/app/DeliveryManager";
import { NotificationsPage } from "@/pages/shared/NotificationsPage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDateTime, humanize, ROLE_LABEL, rupees } from "@/lib/format";
import { PLACEMENT_LABEL, REPORT_LABEL } from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type {
  AdminRestaurant,
  AuditLog,
  Campaign,
  CampaignStatus,
  Category,
  CategoryKind,
  Page,
  PaymentStatus,
  Provider,
  Report,
  ReportStatus,
  RoleName,
} from "@/lib/types";
import { useApi } from "@/lib/useApi";

// ------------------------------------------------------------------ reports

export function AdminReportsPage() {
  const toast = useToast();
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [page, setPage] = useState(0);
  const list = useApi<Page<Report>>(`admin:reports:${status}:${page}`, () => api.get("/admin/reports", { status, page, size: 20 }));
  const [resolving, setResolving] = useState<{ report: Report; to: ReportStatus } | null>(null);
  const [flag, setFlag] = useState(true);

  const resolve = async (note: string) => {
    if (!resolving) return;
    try {
      await api.post(`/admin/reports/${resolving.report.id}/resolve`, { status: resolving.to, note: note || null }, {
        flagReview: resolving.to === "RESOLVED" && !!resolving.report.reviewId && flag,
      });
      toast.success("Report updated and the reporter notified");
      setResolving(null);
      list.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Fake reviews, wrong restaurant or hygiene information, and inappropriate content reported by diners." />
      <Tabs
        label="Report status"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(0);
        }}
        tabs={[
          { value: "OPEN", label: "Open" },
          { value: "RESOLVED", label: "Resolved" },
          { value: "DISMISSED", label: "Dismissed" },
        ]}
      />
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={Flag} title="No reports here" />
      ) : (
        <>
          <ul className="space-y-3">
            {list.data?.content.map((r) => (
              <li key={r.id} className="rounded-card border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold">
                    <Badge tone="caution">{REPORT_LABEL[r.type]}</Badge>{" "}
                    <Link to={`/restaurants/${r.restaurantId}`} className="hover:text-brand-strong">{r.restaurantName}</Link>
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 text-[14px] text-ink">{r.details}</p>
                {r.reviewExcerpt && (
                  <blockquote className="mt-2 border-l-2 border-line pl-3 text-[13.5px] text-muted">Review #{r.reviewId}: {r.reviewExcerpt}</blockquote>
                )}
                <p className="mt-2 text-[12.5px] text-muted">From {r.reporterName} · {formatDateTime(r.createdAt)}</p>
                {r.resolutionNote && <p className="mt-1 text-[13.5px]">Outcome: {r.resolutionNote}</p>}
                {r.status === "OPEN" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setResolving({ report: r, to: "RESOLVED" })}>Resolve</Button>
                    <Button size="sm" variant="secondary" onClick={() => setResolving({ report: r, to: "DISMISSED" })}>Dismiss</Button>
                    {r.reviewId && <Link to="/admin/reviews" className="inline-flex min-h-9 items-center text-[14px] font-semibold text-brand">Open moderation</Link>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
        </>
      )}
      <ConfirmDialog
        open={!!resolving}
        title={resolving?.to === "RESOLVED" ? "Resolve this report?" : "Dismiss this report?"}
        confirmLabel={resolving?.to === "RESOLVED" ? "Resolve" : "Dismiss"}
        reasonLabel="Note to the reporter"
        reasonRequired={false}
        onClose={() => setResolving(null)}
        onConfirm={resolve}
      >
        {resolving?.to === "RESOLVED" && resolving.report.reviewId && (
          <Checkbox label="Also flag the review" hint="Hides it from the public page until it is moderated again." checked={flag} onChange={setFlag} />
        )}
      </ConfirmDialog>
    </div>
  );
}

// ------------------------------------------------------------------ delivery providers

export function AdminProvidersPage() {
  const toast = useToast();
  const list = useApi<Provider[]>("admin:providers", () => api.get("/admin/delivery-providers"));
  const [editing, setEditing] = useState<{ provider?: Provider } | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery providers"
        description="The platforms prices are compared across. Every provider stays MANUAL until a real API integration is built for it."
        actions={<Button onClick={() => setEditing({})}><Plus className="h-4 w-4" aria-hidden="true" /> Add provider</Button>}
      />
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.length === 0 ? (
        <EmptyState icon={Truck} title="No providers" />
      ) : (
        <Table caption="Delivery providers">
          <thead><tr><Th>Provider</Th><Th>Integration</Th><Th>Type</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {list.data?.map((p) => (
              <tr key={p.id}>
                <Td><p className="font-semibold">{p.name}</p><p className="text-[13px] text-muted">{p.websiteUrl ?? p.slug}</p></Td>
                <Td>{p.integrationType === "API" ? <Badge tone="info">API</Badge> : <Badge>Manual</Badge>}</Td>
                <Td className="text-[13.5px]">{p.directChannel ? "Restaurant's own channel" : "Aggregator"}</Td>
                <Td>{p.active ? <Badge tone="brand">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="text-right"><Button size="sm" variant="secondary" onClick={() => setEditing({ provider: p })}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</Button></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {editing && (
        <ProviderDialog
          provider={editing.provider}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
            toast.success("Provider saved");
          }}
        />
      )}
    </div>
  );
}

function ProviderDialog({ provider, onClose, onSaved }: { provider?: Provider; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: provider?.name ?? "",
    slug: provider?.slug ?? "",
    websiteUrl: provider?.websiteUrl ?? "",
    logoUrl: provider?.logoUrl ?? "",
    integrationType: provider?.integrationType ?? "MANUAL",
    directChannel: provider?.directChannel ?? false,
    active: provider?.active ?? true,
    sortOrder: provider?.sortOrder ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.name.trim()) return setError("Enter a name");
    setBusy(true);
    try {
      const body = { ...form, slug: form.slug.trim() || null, websiteUrl: form.websiteUrl.trim() || null, logoUrl: form.logoUrl.trim() || null };
      if (provider) await api.put(`/admin/delivery-providers/${provider.id}`, body);
      else await api.post("/admin/delivery-providers", body);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={provider ? `Edit ${provider.name}` : "Add provider"} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Name" htmlFor="pv-name" required><Input id="pv-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Slug" htmlFor="pv-slug" hint="Lowercase, used to match an API integration. Generated from the name if blank."><Input id="pv-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} /></Field>
        <Field label="Website" htmlFor="pv-web"><Input id="pv-web" type="url" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} /></Field>
        <Field label="Integration" htmlFor="pv-int" hint="Only choose API once a DeliveryQuoteClient for this slug is deployed.">
          <Select id="pv-int" value={form.integrationType} onChange={(e) => setForm((f) => ({ ...f, integrationType: e.target.value as "MANUAL" | "API" }))}>
            <option value="MANUAL">Manual (prices entered by people)</option>
            <option value="API">API (prices fetched from the platform)</option>
          </Select>
        </Field>
        <Field label="Display order" htmlFor="pv-order"><Input id="pv-order" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} className="max-w-32" /></Field>
        <Checkbox label="The restaurant's own ordering channel" checked={form.directChannel} onChange={(v) => setForm((f) => ({ ...f, directChannel: v }))} />
        <Checkbox label="Active" checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ delivery pricing

export function AdminPricingPage() {
  const [params, setParams] = useSearchParams();
  const restaurants = useApi<Page<AdminRestaurant>>("admin:pricing:restaurants", () => api.get("/admin/restaurants", { status: "APPROVED", size: 100 }));
  const selected = Number(params.get("restaurant")) || restaurants.data?.content[0]?.restaurant.id || null;

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery pricing" description="Check and record delivery prices for each restaurant. Prices entered here are labelled “Checked by ServeGood”." />
      {restaurants.loading && !restaurants.data ? (
        <LoadingState />
      ) : restaurants.error ? (
        <ErrorState message={restaurants.error} onRetry={restaurants.reload} />
      ) : !selected ? (
        <EmptyState icon={Truck} title="No listed restaurants yet" />
      ) : (
        <>
          <Field label="Restaurant" htmlFor="pricing-restaurant" required className="max-w-md">
            <Select id="pricing-restaurant" value={selected} onChange={(e) => setParams({ restaurant: e.target.value })}>
              {restaurants.data?.content.map((r) => (
                <option key={r.restaurant.id} value={r.restaurant.id}>{r.restaurant.name} ({r.restaurant.locality})</option>
              ))}
            </Select>
          </Field>
          <DeliveryManager key={selected} restaurantId={selected} scope="admin" />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ advertisements

export function AdminAdsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as CampaignStatus | null) ?? "PENDING";
  const page = Number(params.get("page") ?? 0);
  const list = useApi<Page<Campaign>>(`admin:campaigns:${status}:${page}`, () => api.get("/admin/campaigns", { status, page, size: 20 }));
  const [rejecting, setRejecting] = useState<Campaign | null>(null);

  const replace = (c: Campaign) => list.setData((p) => ({ ...p!, content: p!.content.map((x) => (x.id === c.id ? c : x)) }));
  const decide = async (c: Campaign, approve: boolean, reason: string) => {
    try {
      const { data, message } = await api.send<Campaign>("POST", `/admin/campaigns/${c.id}/decision`, { approve, reason: reason || null });
      replace(data);
      toast.success(message ?? "Saved");
      setRejecting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const payment = async (c: Campaign, paymentStatus: PaymentStatus) => {
    try {
      replace(await api.patch<Campaign>(`/admin/campaigns/${c.id}/payment`, { paymentStatus }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const setStatus = async (c: Campaign, s: CampaignStatus) => {
    try {
      replace(await api.patch<Campaign>(`/admin/campaigns/${c.id}/status`, undefined, { status: s }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Advertisements" description="Approve sponsored placements, track payment, and pause campaigns if needed. Sponsorship never touches ratings, reviews or hygiene scores." />
      <Tabs
        label="Campaign status"
        value={status}
        onChange={(v) => setParams({ status: v })}
        tabs={(["PENDING", "ACTIVE", "PAUSED", "EXPIRED", "REJECTED"] as CampaignStatus[]).map((s) => ({ value: s, label: humanize(s) }))}
      />
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns here" />
      ) : (
        <>
          <ul className="space-y-3">
            {list.data?.content.map((c) => (
              <li key={c.id} className="rounded-card border border-line bg-canvas p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-semibold">{c.name}</p>
                    <p className="text-[13.5px] text-muted">
                      <Link to={`/restaurants/${c.restaurantId}`} className="text-brand hover:text-brand-strong">{c.restaurantName}</Link> · {formatDate(c.startDate)} to {formatDate(c.endDate)}
                      {c.targetLocation && ` · ${c.targetLocation}`}
                    </p>
                    <p className="mt-1 text-[13.5px]">
                      {c.placements.map((p) => `${PLACEMENT_LABEL[p.placement]}${p.headline ? ` (“${p.headline}”)` : ""}`).join(", ")}
                    </p>
                    <p className="mt-1 text-[13.5px]">Budget {rupees(c.budget)} · rate-card estimate {rupees(c.estimatedCost)}</p>
                    {c.placements.some((p) => p.impressions) && (
                      <p className="text-[13px] text-muted">{c.placements.reduce((a, p) => a + p.impressions, 0)} impressions · {c.placements.reduce((a, p) => a + p.clicks, 0)} clicks</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={c.status} />
                    <Select aria-label="Payment status" value={c.paymentStatus} onChange={(e) => payment(c, e.target.value as PaymentStatus)} className="min-h-9 w-auto py-1 text-[13.5px]">
                      <option value="UNPAID">Unpaid</option>
                      <option value="PAID">Paid</option>
                      <option value="REFUNDED">Refunded</option>
                    </Select>
                  </div>
                </div>
                {c.statusReason && <p className="mt-2 text-[13.5px] text-alert">Reason: {c.statusReason}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => decide(c, true, "")}><Check className="h-4 w-4" aria-hidden="true" /> Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => setRejecting(c)}><X className="h-4 w-4" aria-hidden="true" /> Reject</Button>
                    </>
                  )}
                  {c.status === "ACTIVE" && <Button size="sm" variant="secondary" onClick={() => setStatus(c, "PAUSED")}>Pause</Button>}
                  {c.status === "PAUSED" && <Button size="sm" onClick={() => setStatus(c, "ACTIVE")}>Reactivate</Button>}
                  {(c.status === "ACTIVE" || c.status === "PAUSED") && <Button size="sm" variant="ghost" onClick={() => setStatus(c, "EXPIRED")}>End now</Button>}
                </div>
              </li>
            ))}
          </ul>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={(p) => setParams({ status, page: String(p) })} />}
        </>
      )}
      <ConfirmDialog
        open={!!rejecting}
        title="Reject this campaign?"
        confirmLabel="Reject"
        tone="danger"
        reasonLabel="Reason shown to the restaurant"
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => (rejecting ? decide(rejecting, false, reason) : undefined)}
      />
    </div>
  );
}

// ------------------------------------------------------------------ categories

export function AdminCategoriesPage() {
  const toast = useToast();
  const list = useApi<Category[]>("admin:categories", () => api.get("/admin/categories"));
  const [editing, setEditing] = useState<{ category?: Category } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Cuisines and dining styles restaurants can be tagged with and diners can filter by." actions={<Button onClick={() => setEditing({})}><Plus className="h-4 w-4" aria-hidden="true" /> Add category</Button>} />
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.length === 0 ? (
        <EmptyState icon={Tags} title="No categories" />
      ) : (
        (["CUISINE", "DINING_STYLE"] as CategoryKind[]).map((kind) => (
          <section key={kind}>
            <h2 className="sg-h3">{kind === "CUISINE" ? "Cuisines" : "Dining styles"}</h2>
            <div className="mt-3">
              <Table caption={kind === "CUISINE" ? "Cuisines" : "Dining styles"}>
                <thead><tr><Th>Name</Th><Th>Slug</Th><Th>Order</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
                <tbody>
                  {list.data?.filter((c) => c.kind === kind).map((c) => (
                    <tr key={c.id}>
                      <Td className="font-semibold">{c.name}</Td>
                      <Td className="text-[13px] text-muted">{c.slug}</Td>
                      <Td>{c.sortOrder}</Td>
                      <Td>{c.active ? <Badge tone="brand">Active</Badge> : <Badge>Hidden</Badge>}</Td>
                      <Td className="text-right">
                        <Button size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ category: c })}><Pencil className="h-4 w-4" aria-hidden="true" /></Button>
                        <Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </section>
        ))
      )}
      {editing && (
        <CategoryDialog
          category={editing.category}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
            toast.success("Category saved");
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.del(`/admin/categories/${deleting.id}`);
            setDeleting(null);
            list.reload();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        It is removed from every restaurant tagged with it. To keep the tags but hide it from filters, edit it and untick Active instead.
      </ConfirmDialog>
    </div>
  );
}

function CategoryDialog({ category, onClose, onSaved }: { category?: Category; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    kind: category?.kind ?? ("CUISINE" as CategoryKind),
    description: category?.description ?? "",
    active: category?.active ?? true,
    sortOrder: category?.sortOrder ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.name.trim()) return setError("Enter a name");
    setBusy(true);
    try {
      const body = { ...form, slug: form.slug.trim() || null, description: form.description.trim() || null };
      if (category) await api.put(`/admin/categories/${category.id}`, body);
      else await api.post("/admin/categories", body);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={category ? `Edit ${category.name}` : "Add category"} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Name" htmlFor="cat-name" required><Input id="cat-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Type" htmlFor="cat-kind" required>
          <Select id="cat-kind" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as CategoryKind }))}>
            <option value="CUISINE">Cuisine</option>
            <option value="DINING_STYLE">Dining style</option>
          </Select>
        </Field>
        <Field label="Slug" htmlFor="cat-slug" hint="Used in filter URLs. Generated from the name if blank."><Input id="cat-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} /></Field>
        <Field label="Description" htmlFor="cat-desc"><Input id="cat-desc" maxLength={300} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        <Field label="Display order" htmlFor="cat-order"><Input id="cat-order" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} className="max-w-32" /></Field>
        <Checkbox label="Active (shown in filters)" checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ notifications

export function AdminNotificationsPage() {
  const toast = useToast();
  const [form, setForm] = useState({ role: "" as RoleName | "", title: "", body: "", link: "" });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const { message } = await api.send("POST", "/admin/notifications/broadcast", {
        role: form.role || null,
        title: form.title.trim(),
        body: form.body.trim() || null,
        link: form.link.trim() || null,
      });
      toast.success(message ?? "Sent");
      setForm({ role: "", title: "", body: "", link: "" });
      setConfirming(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <Card as="section" className="p-5 sm:p-6">
        <h1 className="sg-h3">Send an announcement</h1>
        <p className="mt-1 text-[14px] text-muted">Appears in each recipient&rsquo;s notifications. Use it sparingly.</p>
        <div className="mt-4 grid gap-4 sm:max-w-xl">
          <Field label="Recipients" htmlFor="bc-role" required>
            <Select id="bc-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleName | "" }))}>
              <option value="">Everyone</option>
              {(["CONSUMER", "RESTAURANT_OWNER", "REVIEWER", "ADMIN"] as RoleName[]).map((r) => <option key={r} value={r}>All {ROLE_LABEL[r].toLowerCase()}s</option>)}
            </Select>
          </Field>
          <Field label="Title" htmlFor="bc-title" required><Input id="bc-title" maxLength={150} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Message" htmlFor="bc-body"><Textarea id="bc-body" rows={3} maxLength={1000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} /></Field>
          <Field label="Link" htmlFor="bc-link" hint="A path inside ServeGood, for example /restaurants"><Input id="bc-link" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} /></Field>
          <div><Button onClick={() => setConfirming(true)} disabled={!form.title.trim()}><Send className="h-4 w-4" aria-hidden="true" /> Send</Button></div>
        </div>
      </Card>
      <NotificationsPage />
      <ConfirmDialog
        open={confirming}
        title="Send this announcement?"
        confirmLabel={busy ? "Sending…" : "Send"}
        onClose={() => setConfirming(false)}
        onConfirm={send}
      >
        It goes to {form.role ? `all ${ROLE_LABEL[form.role as RoleName].toLowerCase()}s` : "every active user"} and cannot be recalled.
      </ConfirmDialog>
    </div>
  );
}

// ------------------------------------------------------------------ audit logs

export function AdminAuditLogsPage() {
  const [filters, setFilters] = useState({ action: "", entityType: "", actor: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(0);
  const list = useApi<Page<AuditLog>>(`admin:logs:${JSON.stringify(applied)}:${page}`, () =>
    api.get("/admin/audit-logs", {
      action: applied.action || undefined,
      entityType: applied.entityType || undefined,
      actor: applied.actor || undefined,
      page,
      size: 50,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Audit logs" description="Every significant action on the platform: who did it, when, and to what." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
          setPage(0);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <Field label="Action" htmlFor="log-action"><Input id="log-action" placeholder="e.g. REVIEW_MODERATED" value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} className="min-h-10 py-1" /></Field>
        <Field label="Entity" htmlFor="log-entity">
          <Select id="log-entity" value={filters.entityType} onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))} className="min-h-10 py-1">
            <option value="">Any</option>
            {["USER", "RESTAURANT", "REVIEW", "HYGIENE_AUDIT", "ASSIGNMENT", "CAMPAIGN", "REPORT", "CATEGORY", "DELIVERY_PROVIDER", "NOTIFICATION"].map((t) => (
              <option key={t} value={t}>{humanize(t)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Actor email" htmlFor="log-actor"><Input id="log-actor" value={filters.actor} onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))} className="min-h-10 py-1" /></Field>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={ScrollText} title="No matching entries" />
      ) : (
        <>
          <Table caption="Audit log">
            <thead><tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Entity</Th><Th>Details</Th><Th>IP</Th></tr></thead>
            <tbody>
              {list.data?.content.map((l) => (
                <tr key={l.id}>
                  <Td className="text-[13px] whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
                  <Td className="text-[13px]">{l.actorEmail ?? "System"}</Td>
                  <Td className="text-[13px] font-semibold">{l.action}</Td>
                  <Td className="text-[13px]">{humanize(l.entityType)}{l.entityId !== null && ` #${l.entityId}`}</Td>
                  <Td className="max-w-[18rem] text-[13px] break-words text-muted">{l.details ?? "—"}</Td>
                  <Td className="text-[12.5px] text-muted">{l.ipAddress ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={setPage} />}
        </>
      )}
    </div>
  );
}
