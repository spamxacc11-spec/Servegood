import { useState } from "react";
import { BookOpen, Leaf, Megaphone, Pause, Pencil, Play, Plus, Send, Trash2 } from "lucide-react";
import { DeliveryManager } from "@/components/app/DeliveryManager";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUpload } from "@/components/ui/ImageUpload";
import {
  Alert,
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
  Select,
  SponsoredLabel,
  StatusBadge,
  Textarea,
} from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { addDaysIso, formatDate, rupees, todayIso } from "@/lib/format";
import { PLACEMENT_LABEL } from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type { AdPlacement, Campaign, CampaignRequest, Menu, MenuItem } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useCatalog } from "@/lib/useCatalog";
import { useCurrentRestaurant } from "./useCurrentRestaurant";

// ------------------------------------------------------------------ menu

export function OwnerMenuPage() {
  const { current, placeholder } = useCurrentRestaurant();
  const id = current?.restaurant.id;
  const toast = useToast();
  const menus = useApi<Menu[]>(id ? `owner:menus:${id}` : null, () => api.get(`/owner/restaurants/${id}/menus`));
  const [section, setSection] = useState<{ menu?: Menu } | null>(null);
  const [item, setItem] = useState<{ item?: MenuItem; menuId?: number } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "menu"; menu: Menu } | { kind: "item"; item: MenuItem } | null>(null);

  if (placeholder) return <div className="space-y-6"><PageHeader title="Menu" />{placeholder}</div>;

  const toggle = async (i: MenuItem) => {
    try {
      const updated = await api.patch<MenuItem>(`/owner/menu-items/${i.id}/availability`, { available: !i.available });
      menus.setData((list) => list!.map((m) => ({ ...m, items: m.items.map((x) => (x.id === i.id ? updated : x)) })));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu"
        description="Organise dishes into sections, set prices, and mark dishes unavailable when they run out."
        actions={
          <>
            <Button variant="secondary" onClick={() => setSection({})}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add section
            </Button>
            <Button onClick={() => setItem({ menuId: menus.data?.[0]?.id })} disabled={!menus.data?.length}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add dish
            </Button>
          </>
        }
      />

      {menus.loading && !menus.data ? (
        <LoadingState />
      ) : menus.error ? (
        <ErrorState message={menus.error} onRetry={menus.reload} />
      ) : menus.data && menus.data.length === 0 ? (
        <EmptyState icon={BookOpen} title="Start with a section" action={<Button onClick={() => setSection({})}>Add a section</Button>}>
          Sections group your dishes, for example &ldquo;Starters&rdquo;, &ldquo;Biryani&rdquo; or &ldquo;Drinks&rdquo;.
        </EmptyState>
      ) : (
        menus.data?.map((m) => (
          <Card key={m.id} as="section" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-5 py-3">
              <div>
                <h2 className="sg-h3">{m.name}</h2>
                {m.description && <p className="text-[13px] text-muted">{m.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => setItem({ menuId: m.id })}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Dish
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Rename ${m.name}`} onClick={() => setSection({ menu: m })}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${m.name}`} onClick={() => setConfirm({ kind: "menu", menu: m })}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            {m.items.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-muted">No dishes in this section yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {m.items.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                    {i.imageUrl ? (
                      <img src={i.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-control object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-control bg-surface" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-semibold text-ink">
                        {i.vegetarian && <Leaf className="h-4 w-4 text-brand" aria-label="Vegetarian" />}
                        {i.name}
                      </p>
                      {i.description && <p className="truncate text-[13px] text-muted">{i.description}</p>}
                    </div>
                    <p className="font-semibold tabular-nums">{rupees(i.price)}</p>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13.5px]">
                      <input type="checkbox" checked={i.available} onChange={() => toggle(i)} className="h-[18px] w-[18px] accent-brand" />
                      Available
                    </label>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Edit ${i.name}`} onClick={() => setItem({ item: i })}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete ${i.name}`} onClick={() => setConfirm({ kind: "item", item: i })}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))
      )}

      {section && (
        <SectionDialog
          restaurantId={id!}
          menu={section.menu}
          onClose={() => setSection(null)}
          onSaved={() => {
            setSection(null);
            menus.reload();
          }}
        />
      )}
      {item && menus.data && (
        <ItemDialog
          restaurantId={id!}
          menus={menus.data}
          item={item.item}
          menuId={item.menuId}
          onClose={() => setItem(null)}
          onSaved={() => {
            setItem(null);
            menus.reload();
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === "menu" ? `Delete the section “${confirm.menu.name}”?` : `Delete “${confirm?.kind === "item" ? confirm.item.name : ""}”?`}
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          try {
            if (confirm.kind === "menu") await api.del(`/owner/menus/${confirm.menu.id}`);
            else await api.del(`/owner/menu-items/${confirm.item.id}`);
            toast.success("Deleted");
            setConfirm(null);
            menus.reload();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        {confirm?.kind === "menu" ? "Sections can only be deleted when they are empty." : "The dish disappears from your menu. Ratings on old reviews keep its name."}
      </ConfirmDialog>
    </div>
  );
}

function SectionDialog({ restaurantId, menu, onClose, onSaved }: { restaurantId: number; menu?: Menu; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(menu?.name ?? "");
  const [description, setDescription] = useState(menu?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!name.trim()) return setError("Give the section a name");
    setBusy(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, sortOrder: menu?.sortOrder };
      if (menu) await api.put(`/owner/menus/${menu.id}`, body);
      else await api.post(`/owner/restaurants/${restaurantId}/menus`, body);
      toast.success("Section saved");
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={menu ? "Edit section" : "Add section"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Section name" htmlFor="sec-name" required>
          <Input id="sec-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="sec-desc">
          <Input id="sec-desc" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function ItemDialog({
  restaurantId,
  menus,
  item,
  menuId,
  onClose,
  onSaved,
}: {
  restaurantId: number;
  menus: Menu[];
  item?: MenuItem;
  menuId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    menuId: item?.menuId ?? menuId ?? menus[0]?.id,
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? String(item.price) : "",
    image: item?.imageUrl ? [item.imageUrl] : ([] as string[]),
    available: item?.available ?? true,
    vegetarian: item?.vegetarian ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const f: Record<string, string> = {};
    if (!form.name.trim()) f.name = "Name the dish";
    if (form.price === "" || Number(form.price) < 0) f.price = "Enter a price of 0 or more";
    setErrors(f);
    if (Object.keys(f).length) return;
    setBusy(true);
    try {
      const body = {
        menuId: form.menuId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        imageUrl: form.image[0] ?? null,
        available: form.available,
        vegetarian: form.vegetarian,
        sortOrder: item?.sortOrder,
      };
      if (item) await api.put(`/owner/menu-items/${item.id}`, body);
      else await api.post(`/owner/restaurants/${restaurantId}/menu-items`, body);
      toast.success("Dish saved");
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `Edit ${item.name}` : "Add a dish"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save dish</Button></>}
    >
      <div className="space-y-4">
        <Field label="Section" htmlFor="item-menu" required>
          <Select id="item-menu" value={form.menuId} onChange={(e) => setForm((f) => ({ ...f, menuId: Number(e.target.value) }))}>
            {menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label="Dish name" htmlFor="item-name" required error={errors.name}>
          <Input id="item-name" maxLength={150} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Description" htmlFor="item-desc">
          <Textarea id="item-desc" rows={2} maxLength={500} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Field>
        <Field label="Price (₹)" htmlFor="item-price" required error={errors.price}>
          <Input id="item-price" type="number" min={0} step="0.01" inputMode="decimal" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="max-w-40" />
        </Field>
        <Field label="Photo">
          <ImageUpload purpose="MENU_ITEM" value={form.image} onChange={(v) => setForm((f) => ({ ...f, image: v }))} />
        </Field>
        <div className="flex flex-wrap gap-x-6">
          <Checkbox label="Vegetarian" checked={form.vegetarian} onChange={(v) => setForm((f) => ({ ...f, vegetarian: v }))} />
          <Checkbox label="Available now" checked={form.available} onChange={(v) => setForm((f) => ({ ...f, available: v }))} />
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ delivery

export function OwnerDeliveryPage() {
  const { current, placeholder } = useCurrentRestaurant();
  return (
    <div className="space-y-6">
      <PageHeader title="Delivery options" description="Where diners can order from you, with prices for your comparison basket." />
      {placeholder ?? <DeliveryManager key={current!.restaurant.id} restaurantId={current!.restaurant.id} scope="owner" />}
    </div>
  );
}

// ------------------------------------------------------------------ advertising

const PLACEMENTS: { value: AdPlacement; hint: string }[] = [
  { value: "HOMEPAGE", hint: "A sponsored card on the ServeGood homepage" },
  { value: "SEARCH_RESULTS", hint: "Above search results, in a separate sponsored strip" },
  { value: "CATEGORY_PAGE", hint: "On one cuisine or style's listing page" },
  { value: "LOCAL_RECOMMENDATIONS", hint: "On the restaurants page for your area" },
];

export function OwnerAdvertisingPage() {
  const { current, placeholder } = useCurrentRestaurant();
  const id = current?.restaurant.id;
  const toast = useToast();
  const campaigns = useApi<Campaign[]>(id ? `owner:campaigns:${id}` : null, () => api.get(`/owner/restaurants/${id}/campaigns`));
  const rates = useApi<{ dailyRates: Record<AdPlacement, number> }>("owner:rates", () => api.get("/owner/ads/rate-card"));
  const [editing, setEditing] = useState<{ campaign?: Campaign } | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);

  if (placeholder) return <div className="space-y-6"><PageHeader title="Advertising" />{placeholder}</div>;

  const act = async (c: Campaign, action: "submit" | "pause" | "resume") => {
    try {
      const { data, message } = await api.send<Campaign>("POST", `/owner/campaigns/${c.id}/${action}`);
      campaigns.setData((list) => list!.map((x) => (x.id === data.id ? data : x)));
      toast.success(message ?? "Updated");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const active = (campaigns.data ?? []).filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertising"
        description="Buy sponsored placement to be seen by more diners in your area."
        actions={
          <Button onClick={() => setEditing({})} disabled={current!.status !== "APPROVED"}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New campaign
          </Button>
        }
      />

      <Alert tone="info" title="What sponsorship does and does not do">
        Sponsored placements always carry a <SponsoredLabel className="mx-0.5" /> label and sit in their own slot. They never change your
        ratings, reviews, hygiene score or your position in ranked results. Every campaign is approved by ServeGood before it runs; invoices are
        handled by our team and payment status is shown on each campaign.
      </Alert>
      {current!.status !== "APPROVED" && <Alert tone="warning">Your restaurant must be approved and listed before it can advertise.</Alert>}

      {rates.data && (
        <Card className="p-5">
          <h2 className="sg-h3">Daily rates</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PLACEMENTS.map((p) => (
              <div key={p.value} className="rounded-control bg-surface p-3">
                <dt className="text-[13px] text-muted">{PLACEMENT_LABEL[p.value]}</dt>
                <dd className="font-display text-lg font-bold">{rupees(rates.data!.dailyRates[p.value])}<span className="text-[13px] font-normal text-muted"> / day</span></dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {active.length > 0 && (
        <p className="text-[14.5px] text-ink">
          <span className="font-semibold">{active.length}</span> active campaign{active.length === 1 ? "" : "s"} right now.
        </p>
      )}

      {campaigns.loading && !campaigns.data ? (
        <LoadingState />
      ) : campaigns.error ? (
        <ErrorState message={campaigns.error} onRetry={campaigns.reload} />
      ) : campaigns.data && campaigns.data.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet">Create a campaign, choose where it appears and when, then submit it for approval.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {campaigns.data?.map((c) => (
            <li key={c.id} className="rounded-card border border-line bg-canvas p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-ink">{c.name}</p>
                  <p className="mt-0.5 text-[13.5px] text-muted">
                    {formatDate(c.startDate)} to {formatDate(c.endDate)}
                    {c.targetLocation && ` · ${c.targetLocation}`} · Budget {rupees(c.budget)} · Suggested {rupees(c.estimatedCost)}
                  </p>
                  <p className="mt-1 text-[13.5px] text-ink">{c.placements.map((p) => PLACEMENT_LABEL[p.placement]).join(", ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  <StatusBadge status={c.paymentStatus} />
                </div>
              </div>
              {c.statusReason && <p className="mt-2 rounded-control bg-alert-wash p-3 text-[13.5px]">Reason: {c.statusReason}</p>}
              {c.placements.some((p) => p.impressions > 0) && (
                <p className="mt-2 text-[13px] text-muted">
                  {c.placements.reduce((a, p) => a + p.impressions, 0)} impressions · {c.placements.reduce((a, p) => a + p.clicks, 0)} clicks
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(c.status === "DRAFT" || c.status === "REJECTED") && (
                  <>
                    <Button size="sm" onClick={() => act(c, "submit")}><Send className="h-4 w-4" aria-hidden="true" /> Submit for approval</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing({ campaign: c })}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</Button>
                  </>
                )}
                {c.status === "DRAFT" && (
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete</Button>
                )}
                {c.status === "ACTIVE" && <Button size="sm" variant="secondary" onClick={() => act(c, "pause")}><Pause className="h-4 w-4" aria-hidden="true" /> Pause</Button>}
                {c.status === "PAUSED" && <Button size="sm" onClick={() => act(c, "resume")}><Play className="h-4 w-4" aria-hidden="true" /> Resume</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && rates.data && (
        <CampaignDialog
          restaurantId={id!}
          campaign={editing.campaign}
          rates={rates.data.dailyRates}
          defaultLocation={current!.restaurant.locality ?? "Andheri"}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            campaigns.reload();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.del(`/owner/campaigns/${deleting.id}`);
            setDeleting(null);
            campaigns.reload();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </div>
  );
}

function CampaignDialog({
  restaurantId,
  campaign,
  rates,
  defaultLocation,
  onClose,
  onSaved,
}: {
  restaurantId: number;
  campaign?: Campaign;
  rates: Record<AdPlacement, number>;
  defaultLocation: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { categories } = useCatalog();
  const today = todayIso();
  const [form, setForm] = useState({
    name: campaign?.name ?? "",
    targetLocation: campaign?.targetLocation ?? defaultLocation.split(",")[0],
    startDate: campaign && campaign.startDate >= today ? campaign.startDate : today,
    endDate: campaign && campaign.endDate >= today ? campaign.endDate : addDaysIso(today, 13),
    budget: campaign ? String(campaign.budget) : "",
  });
  const [placements, setPlacements] = useState<Record<AdPlacement, { on: boolean; headline: string; categoryId: number | null; image: string[] }>>(() => {
    const init = {} as Record<AdPlacement, { on: boolean; headline: string; categoryId: number | null; image: string[] }>;
    PLACEMENTS.forEach((p) => {
      const existing = campaign?.placements.find((x) => x.placement === p.value);
      init[p.value] = {
        on: !!existing,
        headline: existing?.headline ?? "",
        categoryId: existing?.categoryId ?? null,
        image: existing?.imageUrl ? [existing.imageUrl] : [],
      };
    });
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const days = Math.max(0, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1);
  const chosen = PLACEMENTS.filter((p) => placements[p.value].on).map((p) => p.value);
  const estimate = days * chosen.reduce((a, p) => a + (rates[p] ?? 0), 0);

  const save = async () => {
    if (!form.name.trim()) return setError("Name the campaign");
    if (!chosen.length) return setError("Choose at least one placement");
    if (form.endDate < form.startDate) return setError("The end date must be on or after the start date");
    if (form.budget === "" || Number(form.budget) < 0) return setError("Enter a budget");
    if (placements.CATEGORY_PAGE.on && !placements.CATEGORY_PAGE.categoryId) return setError("Choose the category page to appear on");
    setBusy(true);
    setError(null);
    const body: CampaignRequest = {
      name: form.name.trim(),
      targetLocation: form.targetLocation.trim() || null,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: Number(form.budget),
      placements: chosen.map((p) => ({
        placement: p,
        headline: placements[p].headline.trim() || null,
        imageUrl: placements[p].image[0] ?? null,
        categoryId: p === "CATEGORY_PAGE" ? placements[p].categoryId : null,
      })),
    };
    try {
      if (campaign) await api.put(`/owner/campaigns/${campaign.id}`, body);
      else await api.post(`/owner/restaurants/${restaurantId}/campaigns`, body);
      toast.success("Campaign saved as a draft. Submit it when you are ready.");
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={campaign ? "Edit campaign" : "New campaign"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save draft</Button></>}
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Campaign name" htmlFor="c-name" required>
            <Input id="c-name" maxLength={120} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Target area" htmlFor="c-loc" hint="Shown to diners browsing this area">
            <Input id="c-loc" maxLength={120} value={form.targetLocation} onChange={(e) => setForm((f) => ({ ...f, targetLocation: e.target.value }))} />
          </Field>
          <Field label="Start date" htmlFor="c-start" required>
            <Input id="c-start" type="date" min={today} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </Field>
          <Field label="End date" htmlFor="c-end" required>
            <Input id="c-end" type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </Field>
        </div>

        <fieldset>
          <legend className="sg-label">Placements</legend>
          <div className="mt-2 space-y-3">
            {PLACEMENTS.map((p) => {
              const state = placements[p.value];
              const update = (patch: Partial<typeof state>) => setPlacements((s) => ({ ...s, [p.value]: { ...s[p.value], ...patch } }));
              return (
                <div key={p.value} className="rounded-control border border-line p-3">
                  <Checkbox
                    label={`${PLACEMENT_LABEL[p.value]} · ${rupees(rates[p.value])}/day`}
                    hint={p.hint}
                    checked={state.on}
                    onChange={(on) => update({ on })}
                  />
                  {state.on && (
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <Field label="Headline" htmlFor={`h-${p.value}`} hint="Short line shown on the sponsored card">
                        <Input id={`h-${p.value}`} maxLength={120} value={state.headline} onChange={(e) => update({ headline: e.target.value })} />
                      </Field>
                      {p.value === "CATEGORY_PAGE" && (
                        <Field label="Category page" htmlFor="c-cat" required>
                          <Select id="c-cat" value={state.categoryId ?? ""} onChange={(e) => update({ categoryId: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">Choose…</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </Select>
                        </Field>
                      )}
                      <Field label="Image" className="sm:col-span-2">
                        <ImageUpload purpose="ADVERTISEMENT" value={state.image} onChange={(image) => update({ image })} />
                      </Field>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget (₹)" htmlFor="c-budget" required hint={`Suggested for these dates and placements: ${rupees(estimate)}`}>
            <Input id="c-budget" type="number" min={0} step="1" inputMode="numeric" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
          </Field>
          <div className="self-end rounded-control bg-surface p-3 text-[14px]">
            {days} day{days === 1 ? "" : "s"} × {chosen.length} placement{chosen.length === 1 ? "" : "s"} = <span className="font-semibold">{rupees(estimate)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
