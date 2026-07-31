import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/commerce";

async function loadRoles(userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const applyRoles = (list: AppRole[]) => {
    setRoles(list);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id).then(applyRoles), 0);
      } else {
        applyRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) loadRoles(data.session.user.id).then(applyRoles);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isVendor = roles.includes("vendor");

  return {
    session,
    user,
    roles,
    isAdmin,
    isSuperAdmin,
    isVendor,
    loading,
    signOut: () => supabase.auth.signOut(),
    refreshSession: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
    },
  };
}
