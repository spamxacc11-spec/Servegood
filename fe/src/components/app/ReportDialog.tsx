import { useState } from "react";
import { Alert, Button, Field, Modal, Select, Textarea } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { ReportType } from "@/lib/types";

const TYPES: { value: ReportType; label: string; needsReview?: boolean }[] = [
  { value: "FAKE_REVIEW", label: "This review looks fake", needsReview: true },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "INCORRECT_RESTAURANT_INFO", label: "Restaurant information is wrong" },
  { value: "INCORRECT_HYGIENE_INFO", label: "Hygiene information is wrong" },
];

export function ReportDialog({
  open,
  onClose,
  restaurantId,
  reviewId,
  defaultType,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: number;
  reviewId?: number | null;
  defaultType?: ReportType;
}) {
  const toast = useToast();
  const options = TYPES.filter((t) => (reviewId ? t.value === "FAKE_REVIEW" || t.value === "INAPPROPRIATE_CONTENT" : !t.needsReview));
  const [type, setType] = useState<ReportType>(defaultType ?? options[0].value);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (details.trim().length < 10) {
      setError("Please describe the problem in at least 10 characters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { message } = await api.send("POST", "/reports", { type, restaurantId, reviewId: reviewId ?? null, details: details.trim() });
      toast.success(message ?? "Report sent");
      setDetails("");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reviewId ? "Report this review" : "Report a problem"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Send report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="What is wrong?" htmlFor="report-type" required>
          <Select id="report-type" value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Details" htmlFor="report-details" hint="What should our team check?" required>
          <Textarea id="report-details" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        <p className="text-[13px] text-muted">An admin reviews every report. You will get a notification when it is resolved.</p>
      </div>
    </Modal>
  );
}
