import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[auth] failed to load profile", error.message);
    return false;
  }
  return Boolean(data?.is_admin);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    if (!current?.user) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(await fetchIsAdmin(current.user.id));
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const {
        data: { session: initial },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(initial);
      if (initial?.user) {
        setIsAdmin(await fetchIsAdmin(initial.user.id));
      }
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        void fetchIsAdmin(next.user.id).then((admin) => {
          if (mounted) setIsAdmin(admin);
        });
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setIsAdmin(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin,
      loading,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, isAdmin, loading, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** For route beforeLoad — returns session or null. */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("@tanstack/react-router");
    throw redirect({ to: "/login" });
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  const admin = await fetchIsAdmin(session.user.id);
  if (!admin) {
    const { redirect } = await import("@tanstack/react-router");
    throw redirect({ to: "/orders" });
  }
  return session;
}
