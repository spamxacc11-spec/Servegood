import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { homeFor, useAuth } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import { useUnreadCount } from "@/lib/useUnreadCount";

function settingsPath(home: string) {
  return `${home}/settings`;
}

/** Account button with a disclosure menu. Closes on outside click and Escape. */
export function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const unread = useUnreadCount();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const home = homeFor(user);
  const initials = user.fullName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-[14.5px] font-semibold text-ink transition-colors duration-150 hover:bg-surface"
      >
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-wash font-display text-[13px] font-bold text-brand-strong">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : initials}
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-alert ring-2 ring-canvas" aria-hidden="true" />
          )}
        </span>
        <span className="hidden max-w-[10rem] truncate xl:inline">{user.fullName}</span>
        <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
        <span className="sr-only">Account menu{unread > 0 ? `, ${unread} unread notifications` : ""}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-card border border-line bg-canvas p-2 shadow-raised">
          <div className="border-b border-line px-3 pt-1 pb-3">
            <p className="truncate text-[14.5px] font-semibold text-ink">{user.fullName}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
            <p className="mt-1 text-[12px] font-semibold tracking-[0.06em] text-brand uppercase">
              {user.roles.map((r) => ROLE_LABEL[r]).join(" · ")}
            </p>
          </div>
          <div className="pt-2">
            <MenuLink to={home} onClick={() => setOpen(false)} icon={LayoutDashboard}>
              Dashboard
            </MenuLink>
            <MenuLink to={`${home}/notifications`} onClick={() => setOpen(false)} icon={Bell}>
              Notifications
              {unread > 0 && (
                <span className="ml-auto rounded-full bg-alert px-1.5 text-[12px] font-semibold text-white">{unread}</span>
              )}
            </MenuLink>
            <MenuLink to={settingsPath(home)} onClick={() => setOpen(false)} icon={Settings}>
              Account settings
            </MenuLink>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await logout();
                navigate("/");
              }}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-control px-3 text-left text-[14.5px] text-ink hover:bg-surface"
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon: typeof Bell;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex min-h-11 items-center gap-2.5 rounded-control px-3 text-[14.5px] text-ink hover:bg-surface"
    >
      <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
      {children}
    </Link>
  );
}
