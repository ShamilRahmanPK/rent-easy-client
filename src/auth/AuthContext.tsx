import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../api/client";
import type { Role, User } from "../lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  has: (role: Role) => boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { email: string; password: string; fullName: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const ME_KEY = ["me"];

// Forget everything cached for the previous person, but keep the live "me" query attached.
function forgetPreviousUser(client: ReturnType<typeof useQueryClient>) {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_KEY[0] });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api.get<User>("/auth/me");
      } catch (error) {
        // Not signed in, suspended, or a stale session: all mean "no user".
        if (error instanceof ApiError && [401, 403].includes(error.status)) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const user = query.data ?? null;

  const login = useCallback(
    async (email: string, password: string) => {
      const signedIn = await api.post<User>("/auth/login", { email, password });
      forgetPreviousUser(queryClient);
      const me = await api.get<User>("/auth/me");
      queryClient.setQueryData(ME_KEY, me);
      return signedIn;
    },
    [queryClient]
  );

  const register = useCallback(
    async (input: { email: string; password: string; fullName: string; phone?: string }) => {
      const created = await api.post<User>("/auth/register", input);
      forgetPreviousUser(queryClient);
      queryClient.setQueryData(ME_KEY, await api.get<User>("/auth/me"));
      return created;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      forgetPreviousUser(queryClient);
      queryClient.setQueryData(ME_KEY, null);
    }
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ME_KEY });
  }, [queryClient]);

  const value = useMemo<AuthState>(() => {
    const roles = user?.roles ?? [];
    return {
      user,
      loading: query.isLoading,
      isStaff: roles.includes("admin") || roles.includes("super_admin"),
      isSuperAdmin: roles.includes("super_admin"),
      has: (role) => roles.includes(role),
      login,
      register,
      logout,
      refresh,
    };
  }, [user, query.isLoading, login, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
