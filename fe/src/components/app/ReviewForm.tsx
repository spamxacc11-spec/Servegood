import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Alert, Button, Field, Input, Select, StarInput, Textarea } from "@/components/ui/primitives";
import { ApiError, errorMessage } from "@/lib/api";
import { todayIso } from "@/lib/format";
import type { FoodRating, MenuItem, Review, ReviewRequest } from "@/lib/types";

/** Create or edit a review. Ratings are required; dishes and photos are optional. */
export function ReviewForm({
  initial,
  menuItems,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Review | null;
  menuItems: MenuItem[];
  onSubmit: (body: ReviewRequest) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [overall, setOverall] = useState(initial?.overallRating ?? 0);
  const [food, setFood] = useState(initial?.foodRating ?? 0);
  const [service, setService] = useState(initial?.serviceRating ?? 0);
  const [hygiene, setHygiene] = useState(initial?.hygieneRating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [visitDate, setVisitDate] = useState(initial?.visitDate ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [dishes, setDishes] = useState<FoodRating[]>(initial?.foodRatings ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f: Record<string, string> = {};
    if (!overall) f.overall = "Choose an overall rating";
    if (!food) f.food = "Rate the food";
    if (!service) f.service = "Rate the service";
    if (!hygiene) f.hygiene = "Rate how clean it looked";
    if (comment.trim().length < 20) f.comment = "Write at least 20 characters about your visit";
    if (dishes.some((d) => !d.dishName.trim() || !d.rating)) f.dishes = "Give every dish a name and a rating, or remove it";
    setErrors(f);
    if (Object.keys(f).length) return;
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        overallRating: overall,
        foodRating: food,
        serviceRating: service,
        hygieneRating: hygiene,
        title: title.trim() || null,
        comment: comment.trim(),
        visitDate: visitDate || null,
        imageUrls: images,
        foodRatings: dishes.map((d) => ({ ...d, dishName: d.dishName.trim() })),
      });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const availableDishes = menuItems.filter((m) => !dishes.some((d) => d.menuItemId === m.id));

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <StarInput label="Overall" value={overall} onChange={setOverall} error={errors.overall} />
        <StarInput label="Food" value={food} onChange={setFood} error={errors.food} />
        <StarInput label="Service" value={service} onChange={setService} error={errors.service} />
        <StarInput label="Cleanliness you saw" value={hygiene} onChange={setHygiene} error={errors.hygiene} />
      </div>
      <p className="text-[13px] text-muted">
        Your cleanliness rating is shown as a diner&rsquo;s impression. It never changes the audited hygiene score.
      </p>

      <Field label="Headline" htmlFor="rv-title">
        <Input id="rv-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Your review" htmlFor="rv-comment" hint="What did you order, and how was it?" required error={errors.comment}>
        <Textarea id="rv-comment" rows={5} maxLength={4000} value={comment} onChange={(e) => setComment(e.target.value)} aria-invalid={!!errors.comment || undefined} />
      </Field>
      <Field label="Date of visit or order" htmlFor="rv-date">
        <Input id="rv-date" type="date" max={todayIso()} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="max-w-xs" />
      </Field>

      <fieldset>
        <legend className="sg-label">
          Dishes you tried <span className="font-normal text-muted">(optional)</span>
        </legend>
        <div className="mt-2 space-y-2">
          {dishes.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Dish ${i + 1} name`}
                value={d.dishName}
                onChange={(e) => setDishes((list) => list.map((x, j) => (j === i ? { ...x, dishName: e.target.value, menuItemId: null } : x)))}
                className="min-w-0 flex-1"
              />
              <Select
                aria-label={`Dish ${i + 1} rating`}
                value={d.rating || ""}
                onChange={(e) => setDishes((list) => list.map((x, j) => (j === i ? { ...x, rating: Number(e.target.value) } : x)))}
                className="w-28"
              >
                <option value="">Rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}/5
                  </option>
                ))}
              </Select>
              <Button variant="ghost" size="sm" aria-label={`Remove dish ${i + 1}`} onClick={() => setDishes((list) => list.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        {dishes.length < 10 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {availableDishes.length > 0 && (
              <Select
                aria-label="Add a dish from the menu"
                value=""
                onChange={(e) => {
                  const item = menuItems.find((m) => m.id === Number(e.target.value));
                  if (item) setDishes((list) => [...list, { menuItemId: item.id, dishName: item.name, rating: 0 }]);
                }}
                className="w-auto min-w-56"
              >
                <option value="">Add a dish from the menu…</option>
                {availableDishes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            )}
            <Button variant="secondary" size="sm" onClick={() => setDishes((list) => [...list, { menuItemId: null, dishName: "", rating: 0 }])}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Other dish
            </Button>
          </div>
        )}
        {errors.dishes && <p className="mt-1.5 text-[13px] text-alert">{errors.dishes}</p>}
      </fieldset>

      <Field label="Photos">
        <ImageUpload purpose="REVIEW" value={images} onChange={setImages} max={6} />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
