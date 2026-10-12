import { useState } from "react";
import { History, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Modal,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, rupees } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type { DeliveryComparison, DeliveryOption, Page, Price, PriceRequest, Provider } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { DeliveryComparisonView } from "./DeliveryComparisonView";

/**
 * Manage ordering options and record prices for one restaurant. Used by owners
 * (/api/owner, prices labelled "reported by the restaurant") and by admins
 * (/api/admin, prices labelled "checked by ServeGood").
 */
export function DeliveryManager({ restaurantId, scope }: { restaurantId: number; scope: "owner" | "admin" }) {
  const toast = useToast();
  const base = `/${scope}`;
  const data = useApi<DeliveryComparison>(`${scope}:delivery:${restaurantId}`, () => api.get(`${base}/restaurants/${restaurantId}/delivery`));
  const providers = useApi<Provider[]>("providers:active", () => api.get("/delivery-providers"));
  const [editing, setEditing] = useState<{ option?: DeliveryOption } | null>(null);
  const [pricing, setPricing] = useState<DeliveryOption | null>(null);
  const [history, setHistory] = useState<DeliveryOption | null>(null);
  const [removing, setRemoving] = useState<DeliveryOption | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const unused = (providers.data ?? []).filter((p) => !data.data?.options.some((o) => o.provider.id === p.id));

  const refreshFromApis = async () => {
    setRefreshing(true);
    try {
      const { message } = await api.send("POST", `/admin/restaurants/${restaurantId}/delivery/refresh`);
      toast.show(message ?? "Done");
      data.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  };

  if (data.loading && !data.data) return <LoadingState />;
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  const d = data.data!;

  return (
    <div className="space-y-6">
      <Alert tone="info">
        Prices here are entered by people and shown to diners with the date they were recorded and who recorded them.
        {scope === "owner"
          ? " Prices you enter are labelled “Reported by the restaurant”."
          : " Prices you enter are labelled “Checked by ServeGood”."}{" "}
        Use the same basket on every option so the comparison is fair{d.basket ? `: ${d.basket}` : ""}.
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing({})} disabled={unused.length === 0}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add ordering option
        </Button>
        {scope === "admin" && (
          <Button variant="secondary" onClick={refreshFromApis} loading={refreshing}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Fetch from connected providers
          </Button>
        )}
      </div>

      {d.options.length === 0 ? (
        <EmptyState title="No ordering options yet">Add Swiggy, Zomato or your own ordering channel, then record a price for the comparison basket.</EmptyState>
      ) : (
        <Table caption="Ordering options and current prices">
          <thead>
            <tr>
              <Th>Option</Th>
              <Th>Status</Th>
              <Th className="text-right">Current total</Th>
              <Th>Last updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {d.options.map((o) => (
              <tr key={o.optionId}>
                <Td>
                  <p className="font-semibold">{o.provider.name}</p>
                  {o.orderingUrl ? (
                    <a href={o.orderingUrl} target="_blank" rel="noreferrer noopener" className="block max-w-[16rem] truncate text-[12.5px] text-brand">
                      {o.orderingUrl}
                    </a>
                  ) : (
                    <p className="text-[12.5px] text-muted">No ordering link</p>
                  )}
                </Td>
                <Td>{o.available ? "Available" : <span className="text-muted">Unavailable</span>}</Td>
                <Td className="text-right font-semibold tabular-nums">
                  {o.currentPrice ? rupees(o.currentPrice.finalTotal) : <span className="font-normal text-muted">No price</span>}
                  {o.cheapest && <p className="text-[12px] font-semibold text-brand-strong">Cheapest</p>}
                </Td>
                <Td className="text-[13px]">
                  {o.currentPrice ? (
                    <>
                      {formatDateTime(o.currentPrice.recordedAt)}
                      <p className="text-muted">{SOURCE_LABEL[o.currentPrice.source]}</p>
                    </>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" onClick={() => setPricing(o)}>Record price</Button>
                    <Button size="sm" variant="ghost" aria-label={`Price history for ${o.provider.name}`} onClick={() => setHistory(o)}>
                      <History className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Edit ${o.provider.name}`} onClick={() => setEditing({ option: o })}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Remove ${o.provider.name}`} onClick={() => setRemoving(o)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {d.options.length > 0 && (
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="sg-h3">How diners see it</h2>
          <div className="mt-4">
            <DeliveryComparisonView data={{ ...d, options: d.options.filter((o) => o.available) }} />
          </div>
        </section>
      )}

      {editing && (
        <OptionDialog
          scope={scope}
          restaurantId={restaurantId}
          option={editing.option}
          providers={editing.option ? [editing.option.provider] : unused}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            data.reload();
          }}
        />
      )}
      {pricing && (
        <PriceDialog
          scope={scope}
          option={pricing}
          defaultBasket={d.basket ?? pricing.currentPrice?.basketDescription ?? ""}
          onClose={() => setPricing(null)}
          onSaved={() => {
            setPricing(null);
            data.reload();
          }}
        />
      )}
      {history && <HistoryDialog scope={scope} option={history} onClose={() => setHistory(null)} />}
      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.provider.name ?? ""}?`}
        confirmLabel="Remove option"
        tone="danger"
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await api.del(`${base}/delivery-options/${removing.optionId}`);
            toast.success("Delivery option removed");
            setRemoving(null);
            data.reload();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        Its price history is deleted too and it disappears from the comparison.
      </ConfirmDialog>
    </div>
  );
}

function OptionDialog({
  scope,
  restaurantId,
  option,
  providers,
  onClose,
  onSaved,
}: {
  scope: "owner" | "admin";
  restaurantId: number;
  option?: DeliveryOption;
  providers: Provider[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [providerId, setProviderId] = useState(option?.provider.id ?? providers[0]?.id ?? 0);
  const [url, setUrl] = useState(option?.orderingUrl ?? "");
  const [available, setAvailable] = useState(option?.available ?? true);
  const [notes, setNotes] = useState(option?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (url && !/^https?:\/\//.test(url)) return setError("The link must start with http:// or https://");
    setBusy(true);
    setError(null);
    try {
      await api.put(`/${scope}/restaurants/${restaurantId}/delivery-options`, {
        providerId,
        orderingUrl: url.trim() || null,
        available,
        notes: notes.trim() || null,
      });
      toast.success("Delivery option saved");
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
      title={option ? `Edit ${option.provider.name}` : "Add ordering option"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Provider" htmlFor="opt-provider" required>
          <Select id="opt-provider" value={providerId} onChange={(e) => setProviderId(Number(e.target.value))} disabled={!!option}>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ordering link" htmlFor="opt-url" hint="The page where diners can order from you on this platform.">
          <Input id="opt-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Field label="Note" htmlFor="opt-notes" hint="Internal note, for example the delivery radius.">
          <Input id="opt-notes" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Checkbox label="Currently available for orders" checked={available} onChange={setAvailable} />
      </div>
    </Modal>
  );
}

function PriceDialog({
  scope,
  option,
  defaultBasket,
  onClose,
  onSaved,
}: {
  scope: "owner" | "admin";
  option: DeliveryOption;
  defaultBasket: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const p = option.currentPrice;
  const [form, setForm] = useState({
    basketDescription: p?.basketDescription ?? defaultBasket,
    foodSubtotal: p ? String(p.foodSubtotal) : "",
    deliveryFee: p ? String(p.deliveryFee) : "0",
    platformFee: p ? String(p.platformFee) : "0",
    otherFees: p ? String(p.otherFees) : "0",
    discount: p ? String(p.discount) : "0",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const n = (v: string) => (v === "" ? 0 : Number(v));
  // Same formula as the server: subtotal + delivery + platform + other - discount.
  const total = n(form.foodSubtotal) + n(form.deliveryFee) + n(form.platformFee) + n(form.otherFees) - n(form.discount);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.basketDescription.trim()) return setError("Describe the basket being priced");
    if (form.foodSubtotal === "") return setError("Enter the food subtotal");
    if ([form.foodSubtotal, form.deliveryFee, form.platformFee, form.otherFees, form.discount].some((v) => n(v) < 0 || Number.isNaN(n(v)))) {
      return setError("Amounts cannot be negative");
    }
    if (total < 0) return setError("The discount is larger than the subtotal plus fees");
    setBusy(true);
    setError(null);
    try {
      const body: PriceRequest = {
        basketDescription: form.basketDescription.trim(),
        foodSubtotal: n(form.foodSubtotal),
        deliveryFee: n(form.deliveryFee),
        platformFee: n(form.platformFee),
        otherFees: n(form.otherFees),
        discount: n(form.discount),
      };
      await api.post(`/${scope}/delivery-options/${option.optionId}/prices`, body);
      toast.success("Price recorded");
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const money = (k: keyof typeof form, label: string, hint?: string) => (
    <Field label={label} htmlFor={`price-${k}`} hint={hint} required={k === "foodSubtotal"}>
      <Input id={`price-${k}`} type="number" min={0} step="0.01" inputMode="decimal" value={form[k]} onChange={(e) => set(k, e.target.value)} />
    </Field>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Record a price on ${option.provider.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save price</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Basket" htmlFor="price-basket" hint="Must be the same order on every option." required>
          <Input id="price-basket" value={form.basketDescription} maxLength={300} onChange={(e) => set("basketDescription", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {money("foodSubtotal", "Food subtotal (₹)")}
          {money("deliveryFee", "Delivery fee (₹)")}
          {money("platformFee", "Platform and packaging fee (₹)")}
          {money("otherFees", "Other fees (₹)", "Taxes or surcharges not included above")}
          {money("discount", "Discount (₹)", "Only offers every diner gets")}
        </div>
        <p className="rounded-control bg-surface p-3 text-[15px]">
          Final total: <span className="font-display text-lg font-bold text-ink tabular-nums">{rupees(Math.max(0, total))}</span>
        </p>
      </div>
    </Modal>
  );
}

function HistoryDialog({ scope, option, onClose }: { scope: "owner" | "admin"; option: DeliveryOption; onClose: () => void }) {
  const list = useApi<Page<Price>>(`history:${option.optionId}`, () => api.get(`/${scope}/delivery-options/${option.optionId}/prices`, { size: 20 }));
  return (
    <Modal open onClose={onClose} title={`Price history: ${option.provider.name}`} wide>
      {list.loading && !list.data ? (
        <LoadingState rows={2} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.data && list.data.content.length === 0 ? (
        <p className="text-muted">No prices recorded yet.</p>
      ) : (
        <Table caption="Price history">
          <thead>
            <tr>
              <Th>Recorded</Th>
              <Th>Source</Th>
              <Th className="text-right">Food</Th>
              <Th className="text-right">Fees</Th>
              <Th className="text-right">Discount</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {list.data?.content.map((p) => (
              <tr key={p.id}>
                <Td className="text-[13px]">{formatDateTime(p.recordedAt)}{p.recordedByName && <p className="text-muted">{p.recordedByName}</p>}</Td>
                <Td className="text-[13px]">{SOURCE_LABEL[p.source]}</Td>
                <Td className="text-right tabular-nums">{rupees(p.foodSubtotal)}</Td>
                <Td className="text-right tabular-nums">{rupees(Number(p.deliveryFee) + Number(p.platformFee) + Number(p.otherFees))}</Td>
                <Td className="text-right tabular-nums">{rupees(p.discount)}</Td>
                <Td className="text-right font-semibold tabular-nums">{rupees(p.finalTotal)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Modal>
  );
}
