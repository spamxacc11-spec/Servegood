import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ChefHat, Eye, EyeOff, UtensilsCrossed } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { homeFor, safeNext, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function AuthFrame({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="sg-container flex justify-center py-12 lg:py-20">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-line bg-canvas p-6 shadow-raised sm:p-8">
            <h1 className="sg-h2 text-[1.75rem]">{title}</h1>
            {intro && <div className="mt-2 text-[15px] text-muted">{intro}</div>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-[14.5px] text-muted">{footer}</div>}
        </div>
      </div>
    </section>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className="pr-12"
        required
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted hover:text-ink"
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ login

export function LoginPage() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "authenticated" && user && !busy) {
    return <Navigate to={next ?? homeFor(user)} replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(next ?? homeFor(u), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Sign in"
      intro="Welcome back. Sign in to save favourites, write reviews, or manage your restaurant."
      footer={
        <>
          New to ServeGood?{" "}
          <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:text-brand-strong">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email" htmlFor="login-email" required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="login-password" required>
          <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-[14px] font-semibold text-brand hover:text-brand-strong">
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" loading={busy} className="w-full" disabled={!email || !password}>
          Sign in
        </Button>
      </form>
    </AuthFrame>
  );
}

// ------------------------------------------------------------------ register

type AccountType = "CONSUMER" | "RESTAURANT_OWNER";

export function RegisterPage() {
  const { register, status, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [type, setType] = useState<AccountType>(params.get("type") === "owner" ? "RESTAURANT_OWNER" : "CONSUMER");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "authenticated" && user && !busy) {
    return <Navigate to={next ?? homeFor(user)} replace />;
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const f: Record<string, string> = {};
    if (!form.fullName.trim()) f.fullName = "Enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) f.email = "Enter a valid email address";
    if (form.password.length < 8) f.password = "Use at least 8 characters";
    if (form.phone && !/^[0-9+()\-\s]{6,30}$/.test(form.phone)) f.phone = "Use digits, spaces and + ( ) -";
    setFields(f);
    return Object.keys(f).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const u = await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        accountType: type,
      });
      const destination = type === "RESTAURANT_OWNER" ? "/restaurant-dashboard/profile?new=1" : next ?? homeFor(u);
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(err.fields);
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const options: { value: AccountType; title: string; body: string; icon: typeof ChefHat }[] = [
    { value: "CONSUMER", title: "I'm a diner", body: "Find clean kitchens, compare prices, write reviews.", icon: UtensilsCrossed },
    { value: "RESTAURANT_OWNER", title: "I run a restaurant", body: "List your kitchen, manage your menu and reviews.", icon: ChefHat },
  ];

  return (
    <AuthFrame
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:text-brand-strong">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <fieldset>
          <legend className="sg-label">Account type</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-control border p-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                  type === o.value ? "border-brand bg-brand-wash" : "border-control hover:border-brand",
                )}
              >
                <input
                  type="radio"
                  name="account-type"
                  value={o.value}
                  checked={type === o.value}
                  onChange={() => setType(o.value)}
                  className="sr-only"
                />
                <span className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
                  <o.icon className="h-4 w-4 text-brand" aria-hidden="true" />
                  {o.title}
                </span>
                <span className="text-[13px] leading-snug text-muted">{o.body}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Full name" htmlFor="reg-name" required error={fields.fullName}>
          <Input id="reg-name" autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!fields.fullName || undefined} />
        </Field>
        <Field label="Email" htmlFor="reg-email" required error={fields.email}>
          <Input id="reg-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!fields.email || undefined} />
        </Field>
        <Field label="Phone" htmlFor="reg-phone" error={fields.phone}>
          <Input id="reg-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!fields.phone || undefined} />
        </Field>
        <Field label="Password" htmlFor="reg-password" hint="At least 8 characters." required error={fields.password}>
          <PasswordInput id="reg-password" value={form.password} onChange={(v) => set("password", v)} autoComplete="new-password" invalid={!!fields.password} />
        </Field>
        {type === "RESTAURANT_OWNER" && (
          <Alert tone="info">
            After signing up you will add your restaurant. It appears publicly once a ServeGood admin approves it.
          </Alert>
        )}
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
    </AuthFrame>
  );
}

// ------------------------------------------------------------------ forgot / reset

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { message } = await api.send("POST", "/auth/forgot-password", { email: email.trim() });
      setSent(message ?? "If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Reset your password"
      intro="Enter the email you signed up with and we will send you a link to choose a new password."
      footer={
        <Link to="/login" className="font-semibold text-brand hover:text-brand-strong">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success" title="Check your email">
          {sent} The link works for 30 minutes.
        </Alert>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Email" htmlFor="forgot-email" required>
            <Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} className="w-full" disabled={!email}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <AuthFrame title="Reset link missing">
        <Alert tone="warning">
          This page needs the link from your reset email.{" "}
          <Link to="/forgot-password" className="font-semibold text-brand">
            Request a new link
          </Link>
          .
        </Alert>
      </AuthFrame>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters");
    if (password !== confirm) return setError("The two passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Choose a new password">
      {done ? (
        <Alert tone="success" title="Password updated">
          You can now sign in with your new password. Taking you to sign in…
        </Alert>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="New password" htmlFor="reset-password" hint="At least 8 characters." required>
            <PasswordInput id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" htmlFor="reset-confirm" required>
            <PasswordInput id="reset-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Update password
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
