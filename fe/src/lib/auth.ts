import { createContext, useContext } from "react";
import type { RoleName, User } from "./types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  accountType: "CONSUMER" | "RESTAURANT_OWNER";
}

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  hasRole: (...roles: RoleName[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Where each role lands after signing in. Someone with several roles goes to the most privileged. */
export function homeFor(user: Pick<User, "roles"> | null): string {
  if (!user) return "/login";
  if (user.roles.includes("ADMIN")) return "/admin";
  if (user.roles.includes("REVIEWER")) return "/reviewer";
  if (user.roles.includes("RESTAURANT_OWNER")) return "/restaurant-dashboard";
  return "/dashboard";
}

/** Only same-site paths are honoured as post-login destinations. */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
