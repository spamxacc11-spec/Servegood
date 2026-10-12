import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Alert, Button, Card, Checkbox, Field, Input, PageHeader } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, ROLE_LABEL } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { User } from "@/lib/types";

export function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    avatar: user?.avatarUrl ? [user.avatarUrl] : ([] as string[]),
    emailNotifications: user?.emailNotifications ?? true,
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.fullName.trim()) return setProfileErrors({ fullName: "Enter your name" });
    setProfileErrors({});
    setSavingProfile(true);
    try {
      const updated = await api.put<User>("/me/profile", {
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim() || null,
        avatarUrl: profile.avatar[0] ?? null,
        emailNotifications: profile.emailNotifications,
      });
      setUser(updated);
      toast.success("Profile saved");
    } catch (err) {
      if (err instanceof ApiError && err.fields) setProfileErrors(err.fields);
      toast.error(errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pw.next.length < 8) return setPwError("Use at least 8 characters for the new password");
    if (pw.next !== pw.confirm) return setPwError("The new passwords do not match");
    setSavingPw(true);
    try {
      const { message } = await api.send("PUT", "/me/password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast.success(message ?? "Password changed");
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Account settings" description={`${user.email} · ${user.roles.map((r) => ROLE_LABEL[r]).join(", ")} · member since ${formatDate(user.createdAt)}`} />

      <Card as="section" className="p-5 sm:p-6">
        <h2 className="sg-h3">Profile</h2>
        <form onSubmit={saveProfile} noValidate className="mt-4 grid gap-4 sm:max-w-lg">
          <Field label="Full name" htmlFor="set-name" required error={profileErrors.fullName}>
            <Input id="set-name" value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} autoComplete="name" />
          </Field>
          <Field label="Phone" htmlFor="set-phone" error={profileErrors.phone}>
            <Input id="set-phone" type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} autoComplete="tel" />
          </Field>
          <Field label="Profile photo">
            <ImageUpload purpose="AVATAR" value={profile.avatar} onChange={(v) => setProfile((p) => ({ ...p, avatar: v }))} max={1} />
          </Field>
          <Checkbox
            label="Email me about my account"
            hint="Review decisions, replies and audit results. Notifications in the app are always on."
            checked={profile.emailNotifications}
            onChange={(v) => setProfile((p) => ({ ...p, emailNotifications: v }))}
          />
          <div>
            <Button type="submit" loading={savingProfile}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      <Card as="section" className="p-5 sm:p-6">
        <h2 className="sg-h3">Change password</h2>
        <p className="mt-1 text-[14px] text-muted">Changing your password signs you out on other devices.</p>
        <form onSubmit={savePassword} noValidate className="mt-4 grid gap-4 sm:max-w-lg">
          {pwError && <Alert tone="error">{pwError}</Alert>}
          <Field label="Current password" htmlFor="pw-current" required>
            <Input id="pw-current" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
          </Field>
          <Field label="New password" htmlFor="pw-new" hint="At least 8 characters." required>
            <Input id="pw-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm" required>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
          </Field>
          <div>
            <Button type="submit" loading={savingPw} disabled={!pw.current || !pw.next}>
              Change password
            </Button>
          </div>
        </form>
      </Card>

      <Card as="section" className="border-alert/30 p-5 sm:p-6">
        <h2 className="sg-h3">Delete account</h2>
        <p className="mt-1 max-w-[62ch] text-[14px] text-muted">
          Your profile is removed and you are signed out everywhere. Reviews you wrote stay published under &ldquo;Removed member&rdquo; so ratings stay accurate.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setDeleting(true)}>
          Delete my account
        </Button>
      </Card>

      <ConfirmDialog
        open={deleting}
        title="Delete your account?"
        confirmLabel="Delete account"
        tone="danger"
        reasonLabel="Enter your password to confirm"
        secret
        onClose={() => setDeleting(false)}
        onConfirm={async (password) => {
          try {
            await api.del("/me", { password });
            await logout();
            navigate("/", { replace: true });
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
