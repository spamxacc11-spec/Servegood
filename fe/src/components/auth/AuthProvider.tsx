import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onSessionChange, refreshSession, setAccessToken } from "@/lib/api";
import { AuthContext, type AuthContextValue, type AuthStatus, type RegisterInput } from "@/lib/auth";
import type { AuthResponse, RoleName, User } from "@/lib/types";

/**
 * Restores the session from the refresh cookie on load, then keeps the user in
 * sync with silent refreshes performed by the API client.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onSessionChange((session) => {
      setUserState(session?.user ?? null);
      setStatus(session ? "authenticated" : "anonymous");
    });
    void refreshSession();
    return unsubscribe;
  }, []);

  const accept = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setUserState(session.user);
    setStatus("authenticated");
    return session.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => accept(await api.post<AuthResponse>("/auth/login", { email, password })),
    [accept],
  );

  const register = useCallback(
    async (input: RegisterInput) => accept(await api.post<AuthResponse>("/auth/register", input)),
    [accept],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUserState(null);
      setStatus("anonymous");
    }
  }, []);

  const hasRole = useCallback((...roles: RoleName[]) => !!user && roles.some((r) => user.roles.includes(r)), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, setUser: setUserState, hasRole }),
    [status, user, login, register, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
