import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/commerce";
import { loadUserRoles } from "@/lib/auth-roles";
import { markPasswordRecovery } from "@/lib/password-recovery";
import { snapshotAuthRedirectParams } from "@/lib/auth-url-snapshot";
import { ensureAuthProfile, displayNameFromUser, loadProfileDisplayName } from "@/lib/auth-profile";
import { needsEmailVerification } from "@/lib/email-verified";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  displayName: string;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVendor: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState("");
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (s: Session | null) => {
    const onVerifyRoute =
      typeof window !== "undefined" &&
      ["/auth/verify-email", "/auth/callback"].includes(
        window.location.pathname.replace(/\/+$/, "") || "/",
      );
    if (s?.user && needsEmailVerification(s.user) && !onVerifyRoute) {
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
      setUser(null);
      setProfileName("");
      setRoles([]);
      setLoading(false);
      return;
    }
    setSession(s);
    setUser(s?.user ?? null);
    if (!s?.user) {
      setProfileName("");
      setRoles([]);
      setLoading(false);
      return;
    }
    try {
      await ensureAuthProfile(s.user);
      const [nextRoles, nextName] = await Promise.all([
        loadUserRoles(s.user.id, s.user.email),
        loadProfileDisplayName(s.user.id),
      ]);
      setRoles(nextRoles);
      setProfileName(nextName);
    } catch {
      setRoles(["user"]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    snapshotAuthRedirectParams();

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      void applySession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      if (cancelled) return;
      if (evt === "PASSWORD_RECOVERY") {
        markPasswordRecovery();
        void applySession(s);
        return;
      }
      if (evt === "INITIAL_SESSION") {
        void applySession(s);
        return;
      }
      if (evt === "TOKEN_REFRESHED") {
        if (s?.user && needsEmailVerification(s.user)) {
          void applySession(s);
          return;
        }
        setSession(s);
        setUser(s?.user ?? null);
        return;
      }
      if (evt === "USER_UPDATED") {
        if (s?.user && needsEmailVerification(s.user)) {
          void applySession(s);
          return;
        }
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          void loadProfileDisplayName(s.user.id).then(setProfileName);
        }
        return;
      }
      setLoading(true);
      void applySession(s);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshRoles = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (!s?.user) {
      setRoles([]);
      return;
    }
    try {
      setRoles(await loadUserRoles(s.user.id, s.user.email));
    } catch {
      /* keep current roles */
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  useEffect(() => {
    const onUpdate = () => {
      void refreshRoles();
    };
    window.addEventListener("nexus-auth-update", onUpdate);
    return () => window.removeEventListener("nexus-auth-update", onUpdate);
  }, [refreshRoles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfileName("");
    setRoles([]);
  }, []);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isVendor = roles.includes("vendor");

  const displayName = displayNameFromUser(user, profileName);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user,
      displayName,
      roles,
      isAdmin,
      isSuperAdmin,
      isVendor,
      loading,
      signOut,
      refreshSession,
      refreshRoles,
    }),
    [
      session,
      user,
      displayName,
      roles,
      isAdmin,
      isSuperAdmin,
      isVendor,
      loading,
      signOut,
      refreshSession,
      refreshRoles,
    ],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
