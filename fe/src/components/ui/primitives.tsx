import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link } from "react-router";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, Star, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/format";
import { STATUS_TONE, TONE_CLASS, type Tone } from "./status";

/* ------------------------------------------------------------------ buttons */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "sg-btn-primary",
  secondary: "sg-btn-secondary",
  ghost: "sg-btn-ghost",
  danger: "sg-btn-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "sg-btn",
        VARIANT[variant],
        size === "sm" && "sg-btn-sm",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  to: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cn("sg-btn", VARIANT[variant], size === "sm" && "sg-btn-sm", className)}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ surfaces */

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" }) {
  return <Tag className={cn("rounded-card border border-line bg-canvas", className)}>{children}</Tag>;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="sg-eyebrow">{eyebrow}</p>}
        <h1 className="sg-h2 mt-1 text-[1.75rem] lg:text-[2rem]">{title}</h1>
        {description && <p className="sg-prose mt-2 text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, to }: { label: string; value: ReactNode; hint?: ReactNode; to?: string }) {
  const body = (
    <>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </>
  );
  return to ? (
    <Link
      to={to}
      className="block rounded-card border border-line bg-canvas p-4 transition-colors duration-150 hover:border-control"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-card border border-line bg-canvas p-4">{body}</div>
  );
}

/* ------------------------------------------------------------------ badges */

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{humanize(status)}</Badge>;
}

/** The mandatory label on every paid placement. */
export function SponsoredLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-control bg-canvas px-2 py-0.5 text-[11.5px] font-semibold tracking-[0.06em] text-ink uppercase",
        className,
      )}
    >
      Sponsored
    </span>
  );
}

/* ------------------------------------------------------------------ ratings */

export function Stars({ value, size = "sm", label }: { value: number | null; size?: "sm" | "md"; label?: string }) {
  const v = value ?? 0;
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${v.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, v - (i - 1)));
        return (
          <span key={i} className={cn("relative inline-block", cls)} aria-hidden="true">
            <Star className={cn("absolute inset-0 text-line", cls)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-caution", cls)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Accessible 1-5 star picker built on radio buttons. */
export function StarInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="sg-label">{label}</legend>
      <div className="mt-1.5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer rounded-[6px] p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
            <input
              type="radio"
              name={name}
              value={i}
              checked={value === i}
              onChange={() => onChange(i)}
              className="sr-only"
            />
            <Star
              className={cn("h-7 w-7 transition-colors duration-100", i <= value ? "text-caution" : "text-line")}
              fill="currentColor"
              strokeWidth={0}
              aria-hidden="true"
            />
            <span className="sr-only">
              {i} star{i > 1 ? "s" : ""}
            </span>
          </label>
        ))}
        <span className="ml-2 text-[13px] text-muted">{value ? `${value}/5` : "Not rated"}</span>
      </div>
      {error && <p className="mt-1 text-[13px] text-alert">{error}</p>}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ form fields */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="sg-label">
        {label}
        {!required && <span className="ml-1.5 font-normal text-muted">(optional)</span>}
      </label>
      {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13.5px] text-alert">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn("sg-input", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn("sg-input min-h-24 leading-relaxed", className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn("sg-input pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand"
      />
      <span>
        <span className="text-[14.5px] text-ink">{label}</span>
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ feedback */

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: { box: "bg-surface border-line text-ink", Icon: Info, icon: "text-brand" },
    success: { box: "bg-brand-wash border-brand/30 text-brand-strong", Icon: CheckCircle2, icon: "text-brand" },
    warning: { box: "bg-caution-wash border-caution/30 text-ink", Icon: AlertTriangle, icon: "text-caution" },
    error: { box: "bg-alert-wash border-alert/30 text-ink", Icon: XCircle, icon: "text-alert" },
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-control border p-3.5", styles.box, className)}>
      <styles.Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", styles.icon)} aria-hidden="true" />
      <div className="min-w-0 text-[14px] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-[14px] text-muted">
      <Loader2 className="h-4 w-4 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </span>
  );
}

export function LoadingState({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="py-6">
      <Spinner label={label} />
      <div aria-hidden="true" className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-control bg-surface motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon?: typeof Info;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-control/60 bg-surface/60 px-6 py-10 text-center">
      {Icon && <Icon className="mx-auto h-8 w-8 text-control" aria-hidden="true" />}
      <p className="sg-h3 mt-3">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-[46ch] text-[14.5px] text-muted">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert tone="error" title="This could not be loaded">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-9 items-center font-semibold text-brand hover:text-brand-strong"
        >
          Try again
        </button>
      )}
    </Alert>
  );
}

/* ------------------------------------------------------------------ tabs */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[14.5px] font-semibold whitespace-nowrap transition-colors duration-150",
              active ? "border-brand text-brand-strong" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[12px]", active ? "bg-brand-wash" : "bg-surface")}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ pagination */

export function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalElements?: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13.5px] text-muted">
        Page {page + 1} of {totalPages}
        {totalElements !== undefined && ` · ${totalElements} result${totalElements === 1 ? "" : "s"}`}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ table */

export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-canvas">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("border-b border-line bg-surface px-4 py-2.5 text-[12.5px] font-semibold text-muted uppercase tracking-[0.04em]", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-4 py-3 align-top text-ink", className)}>{children}</td>;
}

/* ------------------------------------------------------------------ modal */

/**
 * Native <dialog>: focus is trapped and Escape closes it for free, and the
 * page behind is inert while it is open.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-hidden rounded-card border border-line bg-canvas p-0 text-ink shadow-raised backdrop:bg-ink/40",
        wide ? "max-w-3xl" : "max-w-lg",
      )}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id={titleId} className="sg-h3">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-2 inline-flex h-10 w-10 items-center justify-center rounded-control text-muted hover:bg-surface hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
