import { useState, type ReactNode } from "react";
import { Button, Field, Input, Modal, Textarea } from "./primitives";

/**
 * Confirmation for irreversible or consequential actions. When `reasonLabel`
 * is set the user must type a reason, which is passed to `onConfirm`.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = "primary",
  reasonLabel,
  reasonRequired = true,
  secret = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  reasonLabel?: string;
  reasonRequired?: boolean;
  /** Mask the typed value, for password confirmation. */
  secret?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (reasonLabel && reasonRequired && !reason.trim()) {
      setError("This is required");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children && <div className="text-[14.5px] leading-relaxed text-muted">{children}</div>}
      {reasonLabel && (
        <Field label={reasonLabel} required={reasonRequired} error={error} className={children ? "mt-4" : undefined} htmlFor="confirm-reason">
          {secret ? (
            <Input id="confirm-reason" type="password" autoComplete="current-password" value={reason} onChange={(e) => setReason(e.target.value)} />
          ) : (
            <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          )}
        </Field>
      )}
    </Modal>
  );
}
