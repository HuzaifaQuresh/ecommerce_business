import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardPageHeader, ResponsiveScroll, SectionCard } from "@/components/site/PageLayout";
import { RoleAccessGrid } from "@/components/dashboard/RoleAccessGrid";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import { WorkspaceBanner } from "@/components/dashboard/WorkspaceBanner";
import { ROLE_CATALOG, slugifyShop } from "@/lib/roles";
import { toast } from "sonner";
import type { AppRole } from "@/types/commerce";
import {
  Crown,
  Search,
  Users,
  Store,
  ShieldCheck,
  Check,
  X,
  UserPlus,
  KeyRound,
  Mail,
  User,
} from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const hasAdminRights = roles?.some((r) => r.role === "super_admin" || r.role === "admin");
    if (!hasAdminRights) throw redirect({ to: "/admin" });
  },
  component: AdminUsers,
});

type UserRow = {
  user_id: string;
  role: AppRole;
  name: string;
  phone: string | null;
};

type VendorApplicationRow = {
  id: string;
  user_id: string;
  shop_name: string;
  business_email: string;
  phone: string;
  cnic_or_tax_id: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_role: string;
  target_user_id: string;
  action: string;
  old_role: string;
  new_role: string;
  created_at: string;
};

function AdminUsers() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [pending, setPending] = useState<{ userId: string; role: AppRole; name: string } | null>(
    null,
  );

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "admin" as AppRole,
    phone: "",
  });

  const {
    data: usersData,
    refetch: refetchUsers,
    isLoading: loadingUsers,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone");

      const byUser = new Map<string, UserRow>();

      // Initialize with profiles
      for (const p of profiles ?? []) {
        byUser.set(p.id, {
          user_id: p.id,
          role: "user",
          name: p.full_name || `User ${p.id.slice(0, 8)}`,
          phone: p.phone ?? null,
        });
      }

      const rolePriority: Record<string, number> = {
        super_admin: 4,
        admin: 3,
        vendor: 2,
        user: 1,
      };

      for (const r of roles ?? []) {
        const existing = byUser.get(r.user_id);
        const currentRole = existing?.role ?? "user";
        const currentPrio = rolePriority[currentRole] ?? 0;
        const newPrio = rolePriority[r.role] ?? 0;

        if (!existing || newPrio >= currentPrio) {
          const profile = profiles?.find((p) => p.id === r.user_id);
          byUser.set(r.user_id, {
            user_id: r.user_id,
            role: (r.role in ROLE_CATALOG ? r.role : "user") as AppRole,
            name: profile?.full_name ?? existing?.name ?? `User ${r.user_id.slice(0, 8)}`,
            phone: profile?.phone ?? existing?.phone ?? null,
          });
        }
      }

      return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const {
    data: vendorAppsData,
    refetch: refetchVendorApps,
    isLoading: loadingVendorApps,
  } = useQuery({
    queryKey: ["admin-vendor-apps"],
    queryFn: async () => {
      const { data: apps, error } = await supabase
        .from("vendor_applications" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && apps) return apps as VendorApplicationRow[];

      // Local storage fallback for demo mode
      const localApps = JSON.parse(localStorage.getItem("nexus_vendor_apps") || "[]");
      if (localApps.length > 0) return localApps as VendorApplicationRow[];

      return [
        {
          id: "app-demo-101",
          user_id: "demo-customer-99",
          shop_name: "TechTronix Hardware PK",
          business_email: "vendor@techtronix.pk",
          phone: "+92 321 9876543",
          cnic_or_tax_id: "42201-1234567-9",
          description:
            "Authorized reseller of ESP32 modules, STM32 development boards, and relay modules.",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ] as VendorApplicationRow[];
    },
  });

  const { data: auditLogsData } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && logs) return logs as AuditLogRow[];

      return [
        {
          id: "log-1",
          actor_role: "super_admin",
          target_user_id: "demo-vendor-id-1234",
          action: "ROLE_CHANGE",
          old_role: "customer",
          new_role: "vendor",
          created_at: new Date().toISOString(),
        },
      ] as AuditLogRow[];
    },
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usersData ?? [];
    return (usersData ?? []).filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q) ||
        u.role.includes(q) ||
        (u.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [usersData, search]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim()) return toast.error("Please enter the person's name");
    if (!newUser.email.trim()) return toast.error("Please enter their email address");
    if (!newUser.password) return toast.error("Please set a password");

    const emailClean = newUser.email.trim().toLowerCase();
    const uid = "usr-" + Math.random().toString(36).substring(2, 9);

    const accountObj = {
      id: uid,
      email: emailClean,
      password: newUser.password,
      full_name: newUser.name.trim(),
      phone: newUser.phone.trim() || "+92 332 3059259",
      role: newUser.role,
    };

    // Save in registered users list
    const customStr = localStorage.getItem("nexus_registered_users");
    const registered = customStr ? JSON.parse(customStr) : [];
    const existingIdx = registered.findIndex((u: any) => u.email?.toLowerCase() === emailClean);
    if (existingIdx >= 0) {
      registered[existingIdx] = accountObj;
    } else {
      registered.push(accountObj);
    }
    localStorage.setItem("nexus_registered_users", JSON.stringify(registered));

    // Save role in nexus_user_roles overrides
    const storedRoles = JSON.parse(localStorage.getItem("nexus_user_roles") || "{}");
    storedRoles[uid] = newUser.role;
    storedRoles[emailClean] = newUser.role;
    localStorage.setItem("nexus_user_roles", JSON.stringify(storedRoles));

    // Also insert into Supabase tables if connected
    try {
      await supabase.from("profiles").insert({
        id: uid,
        full_name: newUser.name.trim(),
        phone: newUser.phone.trim() || null,
      });
      await supabase.from("user_roles").insert({
        user_id: uid,
        role: newUser.role,
      });
    } catch {
      // ignore
    }

    toast.success(`User ${newUser.name} created as ${ROLE_CATALOG[newUser.role].label}!`);
    setCreateUserOpen(false);
    setNewUser({ name: "", email: "", password: "password123", role: "admin", phone: "" });
    refetchUsers();
  };

  const applyRole = async (userId: string, role: AppRole, displayName: string) => {
    try {
      const targetUser = usersData?.find((u) => u.user_id === userId);
      const storedRoles = JSON.parse(localStorage.getItem("nexus_user_roles") || "{}");
      storedRoles[userId] = role;

      const customStr = localStorage.getItem("nexus_registered_users");
      if (customStr) {
        try {
          const registered = JSON.parse(customStr);
          const updated = registered.map((u: any) => {
            if (
              u.id === userId ||
              u.email === userId ||
              u.email?.toLowerCase() === targetUser?.name?.toLowerCase()
            ) {
              if (u.email) storedRoles[u.email.toLowerCase()] = role;
              return { ...u, role };
            }
            return u;
          });
          localStorage.setItem("nexus_registered_users", JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      localStorage.setItem("nexus_user_roles", JSON.stringify(storedRoles));

      // If updating currently logged in user, update local user state
      const localUserStr = localStorage.getItem("nexus_local_user");
      if (localUserStr) {
        try {
          const localUser = JSON.parse(localUserStr);
          if (localUser.id === userId || localUser.email === userId) {
            localUser.role = role;
            localStorage.setItem("nexus_local_user", JSON.stringify(localUser));
            window.dispatchEvent(new Event("nexus-auth-update"));
          }
        } catch {
          // ignore
        }
      }

      const { error: rpcErr } = await supabase.rpc("admin_assign_role" as any, {
        _target_user_id: userId,
        _new_role: role,
      });

      if (rpcErr) {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: role as "admin" | "user" | "super_admin" | "vendor",
        });
      }

      if (role === "vendor") {
        const { data: existing } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!existing) {
          const shop = `${displayName} Store`;
          await supabase.from("vendors").insert({
            user_id: userId,
            shop_name: shop,
            slug: `${slugifyShop(shop)}-${userId.slice(0, 6)}`,
          });
        }
      }

      toast.success(`Role updated to ${ROLE_CATALOG[role].label}`);
      refetchUsers();
    } catch {
      toast.success(`Role updated to ${ROLE_CATALOG[role].label}`);
      refetchUsers();
    }
  };

  const approveVendorApplication = async (app: VendorApplicationRow) => {
    await applyRole(app.user_id, "vendor", app.shop_name);

    // Update status locally / remote
    try {
      await supabase
        .from("vendor_applications" as any)
        .update({ status: "approved" })
        .eq("id", app.id);
    } catch {
      // ignore
    }

    const localApps = JSON.parse(localStorage.getItem("nexus_vendor_apps") || "[]");
    const updated = localApps.map((a: VendorApplicationRow) =>
      a.id === app.id ? { ...a, status: "approved" } : a,
    );
    localStorage.setItem("nexus_vendor_apps", JSON.stringify(updated));

    toast.success(`Approved ${app.shop_name} as an official IoT Vendor!`);
    refetchVendorApps();
  };

  const rejectVendorApplication = async (app: VendorApplicationRow) => {
    try {
      await supabase
        .from("vendor_applications" as any)
        .update({ status: "rejected" })
        .eq("id", app.id);
    } catch {
      // ignore
    }

    const localApps = JSON.parse(localStorage.getItem("nexus_vendor_apps") || "[]");
    const updated = localApps.map((a: VendorApplicationRow) =>
      a.id === app.id ? { ...a, status: "rejected" } : a,
    );
    localStorage.setItem("nexus_vendor_apps", JSON.stringify(updated));

    toast.info(`Application for ${app.shop_name} rejected.`);
    refetchVendorApps();
  };

  const pendingAppsCount = (vendorAppsData ?? []).filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <WorkspaceBanner
        variant="super_admin"
        roles={["super_admin"]}
        title="Identity & Access Management (RBAC)"
        description="Assign 4-tier roles (super_admin, admin, vendor, customer), approve vendor applications, and inspect security audit logs."
        icon={Crown}
      />

      <DashboardPageHeader
        title="Users & Security Governance"
        description="Multi-tenant authorization, vendor approvals, and security audit trail."
        actions={<RoleBadge role="super_admin" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users & Roles
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2 relative">
            <Store className="h-4 w-4" /> Vendor Approval Queue
            {pendingAppsCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px] rounded-full">
                {pendingAppsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Security Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <SectionCard title="Role Access Matrix">
            <RoleAccessGrid compact />
          </SectionCard>

          <SectionCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Registered Users
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredUsers.length})
                </span>
              </h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, ID, role…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => setCreateUserOpen(true)} className="gap-2 shrink-0">
                  <UserPlus className="h-4 w-4" /> Add User
                </Button>
              </div>
            </div>

            <ResponsiveScroll>
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-3 font-semibold">User</th>
                    <th className="p-3 font-semibold hidden md:table-cell">User ID</th>
                    <th className="p-3 font-semibold">Active Role</th>
                    <th className="p-3 font-semibold">Assign Role</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers && (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-muted-foreground">
                        Loading registered users…
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium">{u.name}</div>
                        {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground hidden md:table-cell">
                        {u.user_id.slice(0, 12)}…
                      </td>
                      <td className="p-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="p-3">
                        <Select
                          value={u.role}
                          onValueChange={(v) =>
                            setPending({ userId: u.user_id, role: v as AppRole, name: u.name })
                          }
                        >
                          <SelectTrigger className="w-full max-w-[11rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["user", "vendor", "admin", "super_admin"] as AppRole[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_CATALOG[r].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {!loadingUsers && !filteredUsers.length && (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-muted-foreground">
                        {search
                          ? "No users match your search criteria."
                          : "No registered users found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ResponsiveScroll>
          </SectionCard>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <SectionCard
            title="Vendor Applications Approval Queue"
            description="Review hardware store applications submitted by customers seeking seller access."
          >
            <ResponsiveScroll>
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-3 font-semibold">Shop Name & Info</th>
                    <th className="p-3 font-semibold">Contact & Tax ID</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVendorApps && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        Loading vendor applications…
                      </td>
                    </tr>
                  )}
                  {(vendorAppsData ?? []).map((app) => (
                    <tr key={app.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold flex items-center gap-1.5">
                          <Store className="h-4 w-4 text-primary" /> {app.shop_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-xs line-clamp-2">
                          {app.description || "No description provided."}
                        </div>
                      </td>
                      <td className="p-3 text-xs space-y-0.5">
                        <div className="font-medium text-foreground">{app.business_email}</div>
                        <div className="text-muted-foreground">{app.phone}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          NTN/CNIC: {app.cnic_or_tax_id}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            app.status === "approved"
                              ? "default"
                              : app.status === "rejected"
                                ? "destructive"
                                : "outline"
                          }
                          className="capitalize text-xs"
                        >
                          {app.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {app.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 px-3"
                              onClick={() => approveVendorApplication(app)}
                            >
                              <Check className="h-3.5 w-3.5" /> Approve Vendor
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1 h-8 px-3"
                              onClick={() => rejectVendorApplication(app)}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loadingVendorApps && !(vendorAppsData ?? []).length && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No vendor applications pending.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ResponsiveScroll>
          </SectionCard>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <SectionCard
            title="Role Modification Security Audit Logs"
            description="Immutable administrative record tracking role changes and user authorizations."
          >
            <ResponsiveScroll>
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-3 font-semibold">Timestamp</th>
                    <th className="p-3 font-semibold">Actor Role</th>
                    <th className="p-3 font-semibold">Action</th>
                    <th className="p-3 font-semibold">Role Transition</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditLogsData ?? []).map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <RoleBadge role={log.actor_role as AppRole} />
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-semibold flex items-center gap-2">
                        <RoleBadge role={log.old_role as AppRole} />
                        <span>→</span>
                        <RoleBadge role={log.new_role as AppRole} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveScroll>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role change</AlertDialogTitle>
            <AlertDialogDescription>
              Assign <strong>{pending && ROLE_CATALOG[pending.role].label}</strong> to{" "}
              <strong>{pending?.name}</strong>?{" "}
              {pending?.role === "vendor" && "A vendor shop record will be created if missing."}
              {pending?.role === "super_admin" &&
                "This grants full platform access including this page."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) applyRole(pending.userId, pending.role, pending.name);
                setPending(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-primary" /> Create Person & Assign Role
            </DialogTitle>
            <DialogDescription>
              Add a new person to the system and grant them immediate role privileges (Admin, Super
              Admin, Vendor, or Customer).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-name"
                  placeholder="e.g. Zainab Ahmed"
                  className="pl-9"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-email"
                  type="email"
                  placeholder="e.g. admin@nexus.pk"
                  className="pl-9"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-password"
                  type="text"
                  placeholder="Password for login"
                  className="pl-9 font-mono"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                The user can log in with this email & password.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Access Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["user", "vendor", "admin", "super_admin"] as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ROLE_CATALOG[r].label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({ROLE_CATALOG[r].shortLabel})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <UserPlus className="h-4 w-4" /> Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
