import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Check, ClipboardList, Pencil, Plus, Search, ShieldCheck, Store, UserPlus, Users, X } from "lucide-react";
import { AuditBreakdown } from "@/components/app/AuditBreakdown";
import { RestaurantForm } from "@/components/app/RestaurantForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Alert,
  Badge,
  Button,
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
  StatCard,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime, ROLE_LABEL } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type {
  AdminRestaurant,
  AdminStats,
  Assignment,
  AssignmentStatus,
  Audit,
  AuditStatus,
  Page,
  RestaurantDetail,
  RestaurantRequest,
  RestaurantStatus,
  RoleName,
  User,
  UserStatus,
} from "@/lib/types";
import { useApi } from "@/lib/useApi";

const ROLES: RoleName[] = ["CONSUMER", "RESTAURANT_OWNER", "REVIEWER", "ADMIN"];

// ------------------------------------------------------------------ dashboard

export function AdminDashboardPage() {
  const stats = useApi<AdminStats>("admin:stats", () => api.get("/admin/stats"));
  const s = stats.data;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Platform overview" description="What needs attention today, and how ServeGood is growing." />
      {stats.loading && !s ? (
        <LoadingState />
      ) : stats.error ? (
        <ErrorState message={stats.error} onRetry={stats.reload} />
      ) : s ? (
        <>
          <section>
            <h2 className="sg-h3">Needs attention</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard label="Restaurants awaiting approval" value={s.restaurantsPending} to="/admin/restaurants?status=PENDING_APPROVAL" />
              <StatCard label="Reviews to moderate" value={s.reviewsPending} hint={`${s.reviewsFlagged} flagged`} to="/admin/reviews" />
              <StatCard label="Audits awaiting approval" value={s.auditsPending} to="/admin/audits?status=PENDING" />
              <StatCard label="Open reports" value={s.reportsOpen} to="/admin/reports" />
              <StatCard label="Campaigns awaiting approval" value={s.campaignsPending} to="/admin/advertisements?status=PENDING" />
              <StatCard label="Active campaigns" value={s.campaignsActive} to="/admin/advertisements?status=ACTIVE" />
            </div>
          </section>
          <section>
            <h2 className="sg-h3">Platform</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard label="Listed restaurants" value={s.restaurantsApproved} to="/admin/restaurants?status=APPROVED" />
              <StatCard label="All users" value={s.users} to="/admin/users" />
              {ROLES.map((r) => (
                <StatCard key={r} label={`${ROLE_LABEL[r]}s`} value={s.usersByRole[r] ?? 0} to={`/admin/users?role=${r}`} />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ users

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const role = (params.get("role") as RoleName | null) ?? "";
  const status = (params.get("status") as UserStatus | null) ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page") ?? 0);
  const [search, setSearch] = useState(q);
  const list = useApi<Page<User>>(`admin:users:${params}`, () => api.get("/admin/users", { q: q || undefined, role: role || undefined, status: status || undefined, page, size: 20 }));
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Change roles, suspend accounts, and create reviewer or admin accounts."
        actions={<Button onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add staff account</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", search.trim());
          }}
          className="flex gap-2"
        >
          <Input aria-label="Search users" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-10 w-60 py-1" />
          <Button type="submit" variant="secondary" size="sm"><Search className="h-4 w-4" aria-hidden="true" /> Search</Button>
        </form>
        <Select aria-label="Role" value={role} onChange={(e) => setParam("role", e.target.value)} className="min-h-10 w-auto py-1">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
        <Select aria-label="Status" value={status} onChange={(e) => setParam("status", e.target.value)} className="min-h-10 w-auto py-1">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={Users} title="No users match" />
      ) : (
        <>
          <Table caption="Users">
            <thead>
              <tr><Th>Name</Th><Th>Roles</Th><Th>Status</Th><Th>Joined</Th><Th>Last sign-in</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody>
              {list.data?.content.map((u) => (
                <tr key={u.id}>
                  <Td><p className="font-semibold">{u.fullName}</p><p className="text-[13px] text-muted">{u.email}</p></Td>
                  <Td><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone={r === "ADMIN" ? "alert" : r === "REVIEWER" ? "info" : "neutral"}>{ROLE_LABEL[r]}</Badge>)}</div></Td>
                  <Td><StatusBadge status={u.status} /></Td>
                  <Td className="text-[13px]">{formatDate(u.createdAt)}</Td>
                  <Td className="text-[13px]">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(u)} disabled={u.id === me?.id}>
                      <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={(p) => setParam("page", String(p))} />}
        </>
      )}

      {editing && (
        <EditUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            list.setData((p) => ({ ...p!, content: p!.content.map((x) => (x.id === u.id ? u : x)) }));
            setEditing(null);
            toast.success("User updated");
          }}
        />
      )}
      {creating && (
        <CreateStaffDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            list.reload();
            toast.success("Account created. Share the password securely and ask them to change it.");
          }}
        />
      )}
    </div>
  );
}

function EditUserDialog({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [roles, setRoles] = useState<RoleName[]>(user.roles);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!roles.length) return setError("Choose at least one role");
    setBusy(true);
    try {
      onSaved(await api.put<User>(`/admin/users/${user.id}`, { roles, status }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Edit ${user.fullName}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <fieldset>
          <legend className="sg-label">Roles</legend>
          {ROLES.map((r) => (
            <Checkbox key={r} label={ROLE_LABEL[r]} checked={roles.includes(r)} onChange={(on) => setRoles((list) => (on ? [...list, r] : list.filter((x) => x !== r)))} />
          ))}
        </fieldset>
        <Field label="Status" htmlFor="u-status" required>
          <Select id="u-status" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended (signed out everywhere)</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function CreateStaffDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", roles: ["REVIEWER"] as RoleName[] });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.fullName.trim() || !form.email.trim()) return setError("Name and email are required");
    if (form.password.length < 8) return setError("Use a temporary password of at least 8 characters");
    setBusy(true);
    try {
      await api.post("/admin/users", { ...form, email: form.email.trim(), fullName: form.fullName.trim() });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Add staff account" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Create account</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Full name" htmlFor="s-name" required><Input id="s-name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></Field>
        <Field label="Email" htmlFor="s-email" required><Input id="s-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Temporary password" htmlFor="s-pw" hint="They can change it from account settings." required>
          <Input id="s-pw" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </Field>
        <fieldset>
          <legend className="sg-label">Roles</legend>
          {(["REVIEWER", "ADMIN"] as RoleName[]).map((r) => (
            <Checkbox key={r} label={ROLE_LABEL[r]} checked={form.roles.includes(r)} onChange={(on) => setForm((f) => ({ ...f, roles: on ? [...f.roles, r] : f.roles.filter((x) => x !== r) }))} />
          ))}
        </fieldset>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ restaurants

export function AdminRestaurantsPage() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const status = (params.get("status") as RestaurantStatus | null) ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page") ?? 0);
  const [search, setSearch] = useState(q);
  const list = useApi<Page<AdminRestaurant>>(`admin:restaurants:${params}`, () => api.get("/admin/restaurants", { q: q || undefined, status: status || undefined, page, size: 20 }));
  const [changing, setChanging] = useState<{ r: AdminRestaurant; to: RestaurantStatus } | null>(null);
  const [owner, setOwner] = useState<AdminRestaurant | null>(null);
  const [editing, setEditing] = useState<{ detail?: RestaurantDetail } | null>(null);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  };

  const replace = (updated: AdminRestaurant) =>
    list.setData((p) => ({ ...p!, content: p!.content.map((x) => (x.restaurant.id === updated.restaurant.id ? updated : x)) }));

  const changeStatus = async (r: AdminRestaurant, to: RestaurantStatus, reason: string) => {
    try {
      replace(await api.patch<AdminRestaurant>(`/admin/restaurants/${r.restaurant.id}/status`, { status: to, reason: reason || null }));
      toast.success(`${r.restaurant.name} is now ${to.toLowerCase().replace("_", " ")}`);
      setChanging(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const openEdit = async (r: AdminRestaurant) => {
    try {
      setEditing({ detail: await api.get<RestaurantDetail>(`/admin/restaurants/${r.restaurant.id}`) });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurants"
        description="Approve new listings, suspend problem listings, and link owner accounts."
        actions={<Button onClick={() => setEditing({})}><Plus className="h-4 w-4" aria-hidden="true" /> Add restaurant</Button>}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          label="Restaurant status"
          value={status || "ALL"}
          onChange={(v) => setParam("status", v === "ALL" ? "" : v)}
          tabs={[
            { value: "ALL", label: "All" },
            { value: "PENDING_APPROVAL", label: "Awaiting approval" },
            { value: "APPROVED", label: "Listed" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
        <form onSubmit={(e) => { e.preventDefault(); setParam("q", search.trim()); }} className="flex gap-2">
          <Input aria-label="Search restaurants" placeholder="Name or locality" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-9 w-56 py-1" />
          <Button type="submit" size="sm" variant="secondary">Search</Button>
        </form>
      </div>
      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState icon={Store} title="No restaurants here" />
      ) : (
        <>
          <Table caption="Restaurants">
            <thead>
              <tr><Th>Restaurant</Th><Th>Owners</Th><Th>Status</Th><Th>Hygiene</Th><Th>Added</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody>
              {list.data?.content.map((a) => (
                <tr key={a.restaurant.id}>
                  <Td>
                    <Link to={`/restaurants/${a.restaurant.id}`} className="font-semibold hover:text-brand-strong">{a.restaurant.name}</Link>
                    <p className="text-[13px] text-muted">{a.restaurant.locality} · {a.viewCount} views</p>
                    {a.statusReason && <p className="text-[12.5px] text-alert">{a.statusReason}</p>}
                  </Td>
                  <Td className="text-[13px]">
                    {a.owners.length ? a.owners.map((o) => <p key={o.userId}>{o.fullName}<span className="block text-muted">{o.email}</span></p>) : <span className="text-muted">None</span>}
                  </Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  <Td className="text-[13px]">{a.restaurant.hygiene.score !== null ? `${a.restaurant.hygiene.score}/100${a.restaurant.hygiene.verified ? "" : " (expired)"}` : "Not audited"}</Td>
                  <Td className="text-[13px]">{formatDate(a.createdAt)}</Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {a.status !== "APPROVED" && <Button size="sm" onClick={() => changeStatus(a, "APPROVED", "")}><Check className="h-4 w-4" aria-hidden="true" /> Approve</Button>}
                      {a.status === "PENDING_APPROVAL" && <Button size="sm" variant="secondary" onClick={() => setChanging({ r: a, to: "REJECTED" })}><X className="h-4 w-4" aria-hidden="true" /> Reject</Button>}
                      {a.status === "APPROVED" && <Button size="sm" variant="secondary" onClick={() => setChanging({ r: a, to: "SUSPENDED" })}>Suspend</Button>}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)} aria-label={`Edit ${a.restaurant.name}`}><Pencil className="h-4 w-4" aria-hidden="true" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setOwner(a)} aria-label={`Link owner to ${a.restaurant.name}`}><UserPlus className="h-4 w-4" aria-hidden="true" /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={(p) => setParam("page", String(p))} />}
        </>
      )}

      <ConfirmDialog
        open={!!changing}
        title={changing?.to === "REJECTED" ? `Reject ${changing?.r.restaurant.name}?` : `Suspend ${changing?.r.restaurant.name}?`}
        confirmLabel={changing?.to === "REJECTED" ? "Reject" : "Suspend"}
        tone="danger"
        reasonLabel="Reason shown to the owner"
        onClose={() => setChanging(null)}
        onConfirm={(reason) => (changing ? changeStatus(changing.r, changing.to, reason) : undefined)}
      >
        {changing?.to === "SUSPENDED" ? "The restaurant disappears from public listings until it is approved again." : "The owner is notified and can fix the details."}
      </ConfirmDialog>

      {owner && (
        <LinkOwnerDialog
          restaurant={owner}
          onClose={() => setOwner(null)}
          onSaved={(r) => {
            replace(r);
            setOwner(null);
            toast.success("Owner linked");
          }}
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.detail ? `Edit ${editing.detail.name}` : "Add restaurant"} wide>
        {editing && (
          <RestaurantForm
            key={editing.detail?.id ?? "new"}
            initial={editing.detail}
            submitLabel={editing.detail ? "Save changes" : "Create and publish"}
            onSubmit={async (body: RestaurantRequest) => {
              if (editing.detail) await api.put(`/restaurants/${editing.detail.id}`, body);
              else await api.post("/restaurants", body);
              toast.success("Restaurant saved");
              setEditing(null);
              list.reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function LinkOwnerDialog({ restaurant, onClose, onSaved }: { restaurant: AdminRestaurant; onClose: () => void; onSaved: (r: AdminRestaurant) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      onSaved(await api.post<AdminRestaurant>(`/admin/restaurants/${restaurant.restaurant.id}/owners`, { email: email.trim() }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Link an owner to ${restaurant.restaurant.name}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => save()} loading={busy}>Link owner</Button></>}>
      <form onSubmit={save} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Owner account email" htmlFor="own-email" hint="The account must be a restaurant owner account." required>
          <Input id="own-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ hygiene audits and assignments

export function AdminAuditsPage() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const view = params.get("view") === "assignments" ? "assignments" : "audits";
  const status = params.get("status") ?? (view === "audits" ? "PENDING" : "");
  const page = Number(params.get("page") ?? 0);
  const audits = useApi<Page<Audit>>(view === "audits" ? `admin:audits:${status}:${page}` : null, () =>
    api.get("/admin/audits", { status: (status as AuditStatus) || undefined, page, size: 10 }),
  );
  const assignments = useApi<Page<Assignment>>(view === "assignments" ? `admin:assignments:${status}:${page}` : null, () =>
    api.get("/admin/assignments", { status: (status as AssignmentStatus) || undefined, page, size: 20 }),
  );
  const [openAudit, setOpenAudit] = useState<Audit | null>(null);
  const [rejecting, setRejecting] = useState<Audit | null>(null);
  const [assigning, setAssigning] = useState(false);

  const decide = async (a: Audit, approve: boolean, note: string) => {
    try {
      const { message } = await api.send<Audit>("POST", `/admin/audits/${a.id}/decision`, { approve, note: note || null });
      toast.success(message ?? "Saved");
      setOpenAudit(null);
      setRejecting(null);
      audits.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const cancel = async (a: Assignment) => {
    try {
      await api.patch(`/admin/assignments/${a.id}/status`, { status: "CANCELLED" });
      assignments.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hygiene audits"
        description="Approve audits to verify restaurants; assign reviewers to kitchens that need a visit."
        actions={<Button onClick={() => setAssigning(true)}><ClipboardList className="h-4 w-4" aria-hidden="true" /> Assign a reviewer</Button>}
      />
      <Tabs
        label="View"
        value={view}
        onChange={(v) => setParams(v === "assignments" ? { view: v } : {})}
        tabs={[
          { value: "audits", label: "Audits" },
          { value: "assignments", label: "Assignments" },
        ]}
      />
      <Select
        aria-label="Status"
        value={status}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("status", e.target.value);
          next.delete("page");
          setParams(next);
        }}
        className="min-h-10 w-auto py-1"
      >
        {view === "audits" ? (
          <>
            <option value="">All submitted</option>
            <option value="PENDING">Awaiting approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Sent back</option>
            <option value="EXPIRED">Expired</option>
          </>
        ) : (
          <>
            <option value="">All</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </>
        )}
      </Select>

      {view === "audits" ? (
        audits.loading && !audits.data ? (
          <LoadingState />
        ) : audits.error ? (
          <ErrorState message={audits.error} onRetry={audits.reload} />
        ) : audits.data && audits.data.content.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No audits here" />
        ) : (
          <>
            <ul className="space-y-3">
              {audits.data?.content.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-canvas p-4">
                  <div>
                    <p className="text-[15.5px] font-semibold">{a.restaurantName}</p>
                    <p className="text-[13.5px] text-muted">
                      {a.reviewerName} · visit {formatDate(a.auditDate)} · {a.overallScore}/100 ({a.tier})
                      {a.submittedAt && ` · submitted ${formatDateTime(a.submittedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    <Button size="sm" variant="secondary" onClick={() => setOpenAudit(a)}>Review</Button>
                  </div>
                </li>
              ))}
            </ul>
            {audits.data && <Pagination page={audits.data.page} totalPages={audits.data.totalPages} onChange={(p) => setParams({ status, page: String(p) })} />}
          </>
        )
      ) : assignments.loading && !assignments.data ? (
        <LoadingState />
      ) : assignments.error ? (
        <ErrorState message={assignments.error} onRetry={assignments.reload} />
      ) : assignments.data && assignments.data.content.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assignments" />
      ) : (
        <Table caption="Reviewer assignments">
          <thead><tr><Th>Restaurant</Th><Th>Reviewer</Th><Th>Due</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {assignments.data?.content.map((a) => (
              <tr key={a.id}>
                <Td><p className="font-semibold">{a.restaurantName}</p><p className="text-[13px] text-muted">{a.locality}</p></Td>
                <Td>{a.reviewerName}</Td>
                <Td className="text-[13px]">{a.dueDate ? formatDate(a.dueDate) : "—"}</Td>
                <Td><StatusBadge status={a.status} /></Td>
                <Td className="text-right">
                  {(a.status === "ASSIGNED" || a.status === "IN_PROGRESS") && <Button size="sm" variant="ghost" onClick={() => cancel(a)}>Cancel</Button>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={!!openAudit}
        onClose={() => setOpenAudit(null)}
        wide
        title={openAudit ? `${openAudit.restaurantName}: ${openAudit.overallScore}/100` : ""}
        footer={
          openAudit?.status === "PENDING" ? (
            <>
              <Button variant="secondary" onClick={() => setRejecting(openAudit)}>Send back</Button>
              <Button onClick={() => decide(openAudit, true, "")}><Check className="h-4 w-4" aria-hidden="true" /> Approve and publish</Button>
            </>
          ) : undefined
        }
      >
        {openAudit && (
          <>
            {openAudit.decisionNote && <Alert tone="info" className="mb-4" title="Decision note">{openAudit.decisionNote}</Alert>}
            <AuditBreakdown audit={openAudit} />
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={!!rejecting}
        title="Send this audit back?"
        confirmLabel="Send back"
        reasonLabel="What the reviewer needs to fix"
        onClose={() => setRejecting(null)}
        onConfirm={(note) => (rejecting ? decide(rejecting, false, note) : undefined)}
      />
      {assigning && (
        <AssignDialog
          onClose={() => setAssigning(false)}
          onSaved={() => {
            setAssigning(false);
            toast.success("Reviewer assigned and notified");
            setParams({ view: "assignments" });
            assignments.reload();
          }}
        />
      )}
    </div>
  );
}

function AssignDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const reviewers = useApi<User[]>("admin:reviewers", () => api.get("/admin/users/reviewers"));
  const restaurants = useApi<Page<AdminRestaurant>>("admin:restaurants:assign", () => api.get("/admin/restaurants", { size: 100 }));
  const [form, setForm] = useState({ reviewerId: "", restaurantId: "", dueDate: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.reviewerId || !form.restaurantId) return setError("Choose a reviewer and a restaurant");
    setBusy(true);
    try {
      await api.post("/admin/assignments", {
        reviewerId: Number(form.reviewerId),
        restaurantId: Number(form.restaurantId),
        dueDate: form.dueDate || null,
        notes: form.notes.trim() || null,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Assign a reviewer" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Assign</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {reviewers.data && reviewers.data.length === 0 && <Alert tone="warning">There are no active reviewer accounts. Create one under Users.</Alert>}
        <Field label="Reviewer" htmlFor="as-rev" required>
          <Select id="as-rev" value={form.reviewerId} onChange={(e) => setForm((f) => ({ ...f, reviewerId: e.target.value }))}>
            <option value="">Choose…</option>
            {reviewers.data?.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </Field>
        <Field label="Restaurant" htmlFor="as-rest" required>
          <Select id="as-rest" value={form.restaurantId} onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))}>
            <option value="">Choose…</option>
            {restaurants.data?.content.filter((r) => r.status !== "REJECTED").map((r) => (
              <option key={r.restaurant.id} value={r.restaurant.id}>{r.restaurant.name} ({r.restaurant.locality})</option>
            ))}
          </Select>
        </Field>
        <Field label="Due date" htmlFor="as-due"><Input id="as-due" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></Field>
        <Field label="Notes for the reviewer" htmlFor="as-notes"><Textarea id="as-notes" rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
      </div>
    </Modal>
  );
}
