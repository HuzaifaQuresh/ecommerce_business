import { useAuth } from "./useAuth";
import type { AppRole } from "@/types/commerce";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function useRole() {
  const { session, user, roles, isAdmin, isSuperAdmin, isVendor, loading, signOut } = useAuth();

  const isCustomer = !isAdmin && !isVendor;

  const primaryRole: AppRole = isSuperAdmin
    ? "super_admin"
    : isAdmin
      ? "admin"
      : isVendor
        ? "vendor"
        : "user";

  const hasRole = (target: AppRole | AppRole[]): boolean => {
    const list = Array.isArray(target) ? target : [target];
    return list.some((r) => {
      if (r === "super_admin") return isSuperAdmin;
      if (r === "admin") return isAdmin;
      if (r === "vendor") return isVendor;
      if (r === "user" || r === ("customer" as any)) return true;
      return roles.includes(r);
    });
  };

  const canAccessRoute = (path: string): boolean => {
    if (path.startsWith("/admin/users") || path.startsWith("/admin/settings")) {
      return isSuperAdmin;
    }
    if (path.startsWith("/admin")) {
      return isAdmin;
    }
    if (path.startsWith("/vendor")) {
      return isVendor || isAdmin;
    }
    if (path.startsWith("/account")) {
      return !!user;
    }
    return true;
  };

  return {
    session,
    user,
    roles,
    primaryRole,
    isCustomer,
    isVendor,
    isAdmin,
    isSuperAdmin,
    loading,
    hasRole,
    canAccessRoute,
    signOut,
  };
}

export function useRequireRole(allowedRoles: AppRole[], redirectTo = "/auth") {
  const { loading, hasRole, user } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: redirectTo, search: { redirect: window.location.pathname } as any });
      return;
    }
    if (!hasRole(allowedRoles)) {
      navigate({ to: "/403" as any });
    }
  }, [loading, user, allowedRoles, navigate, redirectTo, hasRole]);

  return { loading, authorized: user && hasRole(allowedRoles) };
}
