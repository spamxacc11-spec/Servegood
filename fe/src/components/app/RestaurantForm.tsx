import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ApiError, errorMessage } from "@/lib/api";
import { DAY_NAMES } from "@/lib/format";
import type { Category, OpeningHours, RestaurantDetail, RestaurantRequest } from "@/lib/types";
import { useCatalog } from "@/lib/useCatalog";
import { cn } from "@/lib/utils";

function blankRequest(): RestaurantRequest {
  return {
    name: "",
    description: null,
    phone: null,
    email: null,
    website: null,
    priceLevel: 2,
    costForTwo: null,
    coverImageUrl: null,
    comparisonBasket: null,
    address: {
      line1: "",
      line2: null,
      locality: "",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: null,
      country: "India",
      latitude: null,
      longitude: null,
    },
    categoryIds: [],
    openingHours: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ dayOfWeek: d, opensAt: "12:00", closesAt: "23:00" })),
    images: [],
  };
}

function fromDetail(r: RestaurantDetail): RestaurantRequest {
  return {
    name: r.name,
    description: r.description,
    phone: r.phone,
    email: r.email,
    website: r.website,
    priceLevel: r.priceLevel,
    costForTwo: r.costForTwo,
    coverImageUrl: r.coverImageUrl,
    comparisonBasket: r.comparisonBasket,
    address: r.address ?? blankRequest().address,
    categoryIds: r.categories.map((c) => c.id),
    openingHours: r.openingHours,
    images: r.images,
  };
}

/** Create or edit a restaurant's public profile. */
export function RestaurantForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: RestaurantDetail | null;
  onSubmit: (body: RestaurantRequest) => Promise<void>;
  submitLabel: string;
}) {
  const { categories } = useCatalog();
  const [form, setForm] = useState<RestaurantRequest>(() => (initial ? fromDetail(initial) : blankRequest()));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof RestaurantRequest>(k: K, v: RestaurantRequest[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k: keyof RestaurantRequest["address"], v: string | number | null) =>
    setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));
  const str = (v: string) => (v.trim() === "" ? null : v);

  const validate = () => {
    const f: Record<string, string> = {};
    if (!form.name.trim()) f.name = "Enter the restaurant name";
    if (!form.address.line1.trim()) f["address.line1"] = "Enter the street address";
    if (!form.address.locality.trim()) f["address.locality"] = "Enter the locality, for example Lokhandwala, Andheri West";
    if (form.website && !/^https?:\/\//.test(form.website)) f.website = "Start with http:// or https://";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) f.email = "Enter a valid email";
    if (form.openingHours.some((h) => h.opensAt === h.closesAt)) f.openingHours = "Opening and closing time cannot be the same";
    setFields(f);
    return Object.keys(f).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        images: form.images.map((img, i) => ({ ...img, sortOrder: i })),
        coverImageUrl: form.coverImageUrl ?? form.images[0]?.url ?? null,
      });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(err.fields);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleCategory = (c: Category) =>
    set("categoryIds", form.categoryIds.includes(c.id) ? form.categoryIds.filter((x) => x !== c.id) : [...form.categoryIds, c.id]);

  const setHours = (i: number, patch: Partial<OpeningHours>) =>
    set("openingHours", form.openingHours.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <Card as="section" className="space-y-4 p-5 sm:p-6">
        <h2 className="sg-h3">Basics</h2>
        <Field label="Restaurant name" htmlFor="rf-name" required error={fields.name}>
          <Input id="rf-name" value={form.name} maxLength={150} onChange={(e) => set("name", e.target.value)} aria-invalid={!!fields.name || undefined} />
        </Field>
        <Field label="Description" htmlFor="rf-desc" hint="What you cook and what makes it yours. Shown at the top of your page.">
          <Textarea id="rf-desc" rows={4} maxLength={5000} value={form.description ?? ""} onChange={(e) => set("description", str(e.target.value))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price range" htmlFor="rf-price" required>
            <Select id="rf-price" value={form.priceLevel} onChange={(e) => set("priceLevel", Number(e.target.value))}>
              <option value={1}>₹ · Budget</option>
              <option value={2}>₹₹ · Moderate</option>
              <option value={3}>₹₹₹ · Upscale</option>
              <option value={4}>₹₹₹₹ · Fine dining</option>
            </Select>
          </Field>
          <Field label="Average cost for two (₹)" htmlFor="rf-cost">
            <Input
              id="rf-cost"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.costForTwo ?? ""}
              onChange={(e) => set("costForTwo", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </div>
        <Field
          label="Comparison basket"
          htmlFor="rf-basket"
          hint="One fixed order used to compare delivery prices across platforms, for example: 1 chicken biryani, 1 raita."
        >
          <Input id="rf-basket" maxLength={300} value={form.comparisonBasket ?? ""} onChange={(e) => set("comparisonBasket", str(e.target.value))} />
        </Field>
      </Card>

      <Card as="section" className="space-y-4 p-5 sm:p-6">
        <h2 className="sg-h3">Cuisine and style</h2>
        {(["CUISINE", "DINING_STYLE"] as const).map((kind) => (
          <fieldset key={kind}>
            <legend className="sg-label">{kind === "CUISINE" ? "Cuisines" : "Style"}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories
                .filter((c) => c.kind === kind)
                .map((c) => {
                  const active = form.categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategory(c)}
                      className={cn(
                        "min-h-9 rounded-full border px-3 text-[13.5px] font-medium transition-colors duration-150",
                        active ? "border-brand bg-brand-wash text-brand-strong" : "border-line bg-canvas text-ink hover:border-control",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
            </div>
          </fieldset>
        ))}
      </Card>

      <Card as="section" className="space-y-4 p-5 sm:p-6">
        <h2 className="sg-h3">Address and contact</h2>
        <Field label="Street address" htmlFor="rf-l1" required error={fields["address.line1"]}>
          <Input id="rf-l1" value={form.address.line1} onChange={(e) => setAddr("line1", e.target.value)} autoComplete="address-line1" />
        </Field>
        <Field label="Building, floor or landmark" htmlFor="rf-l2">
          <Input id="rf-l2" value={form.address.line2 ?? ""} onChange={(e) => setAddr("line2", str(e.target.value))} autoComplete="address-line2" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Locality" htmlFor="rf-loc" hint="e.g. Versova, Andheri West" required error={fields["address.locality"]}>
            <Input id="rf-loc" value={form.address.locality} onChange={(e) => setAddr("locality", e.target.value)} />
          </Field>
          <Field label="PIN code" htmlFor="rf-pin">
            <Input id="rf-pin" inputMode="numeric" maxLength={12} value={form.address.postalCode ?? ""} onChange={(e) => setAddr("postalCode", str(e.target.value))} autoComplete="postal-code" />
          </Field>
          <Field label="City" htmlFor="rf-city" required>
            <Input id="rf-city" value={form.address.city} onChange={(e) => setAddr("city", e.target.value)} autoComplete="address-level2" />
          </Field>
          <Field label="State" htmlFor="rf-state" required>
            <Input id="rf-state" value={form.address.state} onChange={(e) => setAddr("state", e.target.value)} autoComplete="address-level1" />
          </Field>
          <Field label="Latitude" htmlFor="rf-lat" hint="Used for “near me” search.">
            <Input id="rf-lat" type="number" step="0.000001" min={-90} max={90} value={form.address.latitude ?? ""} onChange={(e) => setAddr("latitude", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Longitude" htmlFor="rf-lng">
            <Input id="rf-lng" type="number" step="0.000001" min={-180} max={180} value={form.address.longitude ?? ""} onChange={(e) => setAddr("longitude", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Phone" htmlFor="rf-phone">
            <Input id="rf-phone" type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", str(e.target.value))} />
          </Field>
          <Field label="Email" htmlFor="rf-email" error={fields.email}>
            <Input id="rf-email" type="email" value={form.email ?? ""} onChange={(e) => set("email", str(e.target.value))} />
          </Field>
          <Field label="Website" htmlFor="rf-web" error={fields.website}>
            <Input id="rf-web" type="url" placeholder="https://" value={form.website ?? ""} onChange={(e) => set("website", str(e.target.value))} />
          </Field>
        </div>
      </Card>

      <Card as="section" className="space-y-3 p-5 sm:p-6">
        <h2 className="sg-h3">Opening hours</h2>
        <p className="text-[13.5px] text-muted">Add more than one interval for split shifts. A closing time earlier than the opening time runs past midnight.</p>
        {fields.openingHours && <p className="text-[13px] text-alert">{fields.openingHours}</p>}
        <ul className="space-y-2">
          {form.openingHours.map((h, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Select aria-label="Day" value={h.dayOfWeek} onChange={(e) => setHours(i, { dayOfWeek: Number(e.target.value) })} className="w-40">
                {DAY_NAMES.map((d, j) => (
                  <option key={d} value={j + 1}>
                    {d}
                  </option>
                ))}
              </Select>
              <Input aria-label="Opens at" type="time" value={h.opensAt} onChange={(e) => setHours(i, { opensAt: e.target.value })} className="w-32" />
              <span className="text-muted">to</span>
              <Input aria-label="Closes at" type="time" value={h.closesAt} onChange={(e) => setHours(i, { closesAt: e.target.value })} className="w-32" />
              <Button variant="ghost" size="sm" aria-label="Remove interval" onClick={() => set("openingHours", form.openingHours.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => set("openingHours", [...form.openingHours, { dayOfWeek: 1, opensAt: "12:00", closesAt: "15:00" }])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add interval
        </Button>
      </Card>

      <Card as="section" className="space-y-3 p-5 sm:p-6">
        <h2 className="sg-h3">Photos</h2>
        <p className="text-[13.5px] text-muted">The first photo is the cover on listings. Use your own photos of your food and kitchen.</p>
        <ImageUpload
          purpose="RESTAURANT"
          value={form.images.map((i) => i.url)}
          onChange={(urls) =>
            setForm((f) => ({
              ...f,
              images: urls.map((url, i) => f.images.find((x) => x.url === url) ?? { id: null, url, altText: null, sortOrder: i }),
              coverImageUrl: urls.includes(f.coverImageUrl ?? "") ? f.coverImageUrl : urls[0] ?? null,
            }))
          }
          max={12}
        />
        {form.images.length > 1 && (
          <Field label="Cover photo" htmlFor="rf-cover">
            <Select id="rf-cover" value={form.coverImageUrl ?? ""} onChange={(e) => set("coverImageUrl", e.target.value)}>
              {form.images.map((img, i) => (
                <option key={img.url} value={img.url}>
                  Photo {i + 1}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
