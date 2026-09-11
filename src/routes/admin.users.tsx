import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadUserRoles } from "@/lib/auth-roles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardPageHeader, ResponsiveScroll, SectionCard } from "@/components/site/PageLayout";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import { ROLE_CATALOG } from "@/lib/roles";
import { toast } from "sonner";
import type { AppRole } from "@/types/commerce";
import { useAuth } from "@/hooks/useAuth";
import {
  assignRoleByEmail,
  assignUserRole,
  listStaffUsers,
  removeStaffUser,
  type StaffRemovalMode,
  type StaffUser,
} from "@/lib/staff-rbac";
import {
  deleteVendorApplication,
  deleteVendorShop,
  listVendorApplications,
  listVendorShops,
  provisionVendor,
  reviewVendorApplication,
  setVendorShopActive,
  type VendorApplicationRow,
  type VendorShopRow,
} from "@/lib/vendor-onboarding";
import {
  Ban,
  Check,
  ChevronDown,
  Crown,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const ASSIGNABLE_ROLES: AppRole[] = ["user", "vendor", "admin", "super_admin"];

export const Route = createFileRoute("/admin/users")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth", search: { tab: "signin" } });
    const roles = await loadUserRoles(session.user.id, session.user.email);
    if (!roles.includes("super_admin")) throw redirect({ to: "/admin" });
  },
  component: AdminUsers,
});

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
  const { user, refreshRoles } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{
    userId?: string;
    email?: string;
    role: AppRole;
    name: string;
    current?: AppRole;
  } | null>(null);
  const [removal, setRemoval] = useState<{
    userId: string;
    email: string;
    name: string;
    mode: StaffRemovalMode;
  } | null>(null);
  const [removalConfirm, setRemovalConfirm] = useState("");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addingVendor, setAddingVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    email: "",
    shopName: "",
    phone: "",
    cnic: "",
    commission: "10",
    notes: "",
  });
  const [newUser, setNewUser] = useState({
    email: "",
    role: "admin" as AppRole,
  });

  const {
    data: usersData,
    refetch: refetchUsers,
    isLoading: loadingUsers,
    isError: usersError,
    error: usersQueryError,
  } = useQuery({
    queryKey: ["admin-users"],
    enabled: typeof window !== "undefined",
    queryFn: listStaffUsers,
  });

  const {
    data: vendorAppsData,
    refetch: refetchVendorApps,
    isLoading: loadingVendorApps,
    isError: vendorAppsError,
    error: vendorAppsQueryError,
  } = useQuery({
    queryKey: ["admin-vendor-apps"],
    enabled: typeof window !== "undefined",
    queryFn: listVendorApplications,
  });

  const {
    data: vendorShopsData,
    refetch: refetchVendorShops,
    isLoading: loadingVendorShops,
    isError: vendorShopsError,
    error: vendorShopsQueryError,
  } = useQuery({
    queryKey: ["admin-vendor-shops"],
    enabled: typeof window !== "undefined",
    queryFn: listVendorShops,
  });

  const { data: auditLogsData, refetch: refetchAudit } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (!error && logs) return logs as AuditLogRow[];
      return [];
    },
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usersData ?? [];
    return (usersData ?? []).filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.user_id.toLowerCase().includes(q) ||
        row.role.includes(q) ||
        (row.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [usersData, search]);

  const counts = useMemo(() => {
    const rows = usersData ?? [];
    return {
      total: rows.length,
      customers: rows.filter((row) => row.role === "user").length,
      vendors: rows.filter((row) => row.role === "vendor").length,
      staff: rows.filter((row) => row.role === "admin" || row.role === "super_admin").length,
    };
  }, [usersData]);

  const superAdminCount = (usersData ?? []).filter((row) => row.role === "super_admin").length;

  const applyPending = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      if (pending.userId) {
        await assignUserRole(pending.userId, pending.role);
      } else if (pending.email) {
        await assignRoleByEmail(pending.email, pending.role);
      } else {
        throw new Error("Missing user");
      }
      toast.success(`${pending.name} is now ${ROLE_CATALOG[pending.role].label}`);
      setPending(null);
      setCreateUserOpen(false);
      setNewUser({ email: "", role: "admin" });
      await refetchUsers();
      await refetchAudit();
      if (pending.userId === user?.id) await refreshRoles();
    } catch (err: any) {
      toast.error(err?.message || "Could not update role");
    } finally {
      setSaving(false);
    }
  };

  const applyRemoval = async () => {
    if (!removal) return;
    if (removal.mode !== "restore") {
      const typed = removalConfirm.trim().toLowerCase();
      if (!typed || typed !== removal.email.trim().toLowerCase()) {
        toast.error("Type the account email to confirm");
        return;
      }
    }
    setSaving(true);
    try {
      await removeStaffUser(removal.userId, removal.mode);
      const done =
        removal.mode === "delete"
          ? `${removal.name} has been removed`
          : removal.mode === "restore"
            ? `${removal.name} can sign in again`
            : `${removal.name} can no longer sign in`;
      toast.success(done);
      setRemoval(null);
      setRemovalConfirm("");
      await Promise.all([refetchUsers(), refetchAudit(), refetchVendorShops()]);
    } catch (err: any) {
      toast.error(err?.message || "Could not update this account");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = newUser.email.trim().toLowerCase();
    if (!emailClean) return toast.error("Enter their email address");
    const existing = usersData?.find((row) => row.email.toLowerCase() === emailClean);
    setPending({
      userId: existing?.user_id,
      email: emailClean,
      role: newUser.role,
      name: existing?.name || emailClean,
      current: existing?.role,
    });
  };

  const approveVendorApplication = async (app: VendorApplicationRow) => {
    setSaving(true);
    try {
      await reviewVendorApplication(app.id, true);
      toast.success(`${app.shop_name} is now a live vendor shop`);
      await Promise.all([refetchUsers(), refetchVendorApps(), refetchVendorShops(), refetchAudit()]);
    } catch (err: any) {
      toast.error(err?.message || "Could not approve vendor");
    } finally {
      setSaving(false);
    }
  };

  const rejectVendorApplication = async (app: VendorApplicationRow) => {
    setSaving(true);
    try {
      await reviewVendorApplication(app.id, false);
      toast.info(`Application for ${app.shop_name} rejected.`);
      await refetchVendorApps();
    } catch (err: any) {
      toast.error(err?.message || "Could not reject application");
    } finally {
      setSaving(false);
    }
  };

  const toggleVendorShop = async (shop: VendorShopRow) => {
    setSaving(true);
    try {
      await setVendorShopActive(shop.id, !shop.is_active);
      toast.success(shop.is_active ? `${shop.shop_name} disabled` : `${shop.shop_name} enabled`);
      await refetchVendorShops();
    } catch (err: any) {
      toast.error(err?.message || "Could not update shop");
    } finally {
      setSaving(false);
    }
  };

  const removeVendorShop = async (shop: VendorShopRow) => {
    if (!window.confirm(`Delete shop "${shop.shop_name}" permanently? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deleteVendorShop(shop.id);
      toast.success(`${shop.shop_name} deleted`);
      await Promise.all([refetchVendorShops(), refetchUsers(), refetchAudit()]);
    } catch (err: any) {
      toast.error(err?.message || "Could not delete shop");
    } finally {
      setSaving(false);
    }
  };

  const removeVendorApplication = async (app: VendorApplicationRow) => {
    if (!window.confirm(`Delete application for "${app.shop_name}"?`)) return;
    setSaving(true);
    try {
      await deleteVendorApplication(app.id);
      toast.success("Application deleted");
      await refetchVendorApps();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete application");
    } finally {
      setSaving(false);
    }
  };

  const deleteAuditLog = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("audit_logs" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Log entry deleted");
      await refetchAudit();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete log");
    } finally {
      setSaving(false);
    }
  };

  const clearAuditLogs = async () => {
    if (!window.confirm("Clear the entire access log? This cannot be undone.")) return;
    setSaving(true);
    try {
      const ids = (auditLogsData ?? []).map((l) => l.id);
      if (!ids.length) {
        toast.info("Access log is already empty");
        return;
      }
      const { error } = await supabase.from("audit_logs" as any).delete().in("id", ids);
      if (error) throw error;
      toast.success("Access log cleared");
      await refetchAudit();
    } catch (err: any) {
      toast.error(err?.message || "Could not clear logs");
    } finally {
      setSaving(false);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newVendor.email.trim().toLowerCase();
    const shopName = newVendor.shopName.trim();
    const commission = Number(newVendor.commission);
    if (!email) return toast.error("Enter the vendor account email");
    if (!shopName) return toast.error("Enter the shop name");
    if (!Number.isFinite(commission) || commission < 0 || commission > 40) {
      return toast.error("Commission must be between 0 and 40%");
    }
    setAddingVendor(true);
    try {
      await provisionVendor({
        email,
        shopName,
        phone: newVendor.phone,
        cnic: newVendor.cnic,
        description: newVendor.notes,
        commissionPct: commission,
      });
      toast.success(`${shopName} is now an active vendor`);
      setAddVendorOpen(false);
      setNewVendor({ email: "", shopName: "", phone: "", cnic: "", commission: "10", notes: "" });
      await Promise.all([refetchUsers(), refetchVendorApps(), refetchVendorShops(), refetchAudit()]);
    } catch (err: any) {
      toast.error(err?.message || "Could not add vendor");
    } finally {
      setAddingVendor(false);
    }
  };

  const pendingAppsCount = (vendorAppsData ?? []).filter((a) => a.status === "pending").length;
  const emailByUserId = useMemo(() => {
    const map = new Map<string, StaffUser>();
    for (const row of usersData ?? []) map.set(row.user_id, row);
    return map;
  }, [usersData]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardPageHeader
        title="Users & Roles"
        description="Assign Customer, Vendor, Admin, or Super Admin. Changes save to the live account immediately."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] gap-2"
              onClick={() => {
                void refetchUsers();
                void refetchAudit();
                void refetchVendorApps();
                void refetchVendorShops();
              }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button
              className="min-h-[44px] gap-2 bg-[#FF7A00] hover:bg-[#E56E00] text-white"
              onClick={() => setCreateUserOpen(true)}
            >
              <UserPlus className="h-4 w-4" /> Assign by email
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-bold text-[#0B192C]">{counts.total}</div>
          <div className="text-xs text-muted-foreground">Registered accounts</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-bold text-[#0B192C]">{counts.customers}</div>
          <div className="text-xs text-muted-foreground">Customers</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-2xl font-bold text-emerald-800">{counts.vendors}</div>
          <div className="text-xs text-emerald-700">Vendors</div>
        </div>
        <div className="rounded-xl border border-[#0052B4]/20 bg-[#0052B4]/5 p-4">
          <div className="text-2xl font-bold text-[#0B192C]">{counts.staff}</div>
          <div className="text-xs text-[#0052B4]">Admins</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="vendors" className="relative gap-2">
            <Store className="h-4 w-4" /> Vendors
            {pendingAppsCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
                {pendingAppsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <SectionCard>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-5 w-5 text-[#FF7A00]" />
                  Accounts
                  <span className="text-sm font-normal text-muted-foreground">
                    ({filteredUsers.length})
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Disable login to block access and keep orders. Delete only when the account must be removed.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, role…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ResponsiveScroll>
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-3 font-semibold">User</th>
                    <th className="hidden p-3 font-semibold md:table-cell">Email</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold text-right">Action</th>
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
                  {usersError && (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-sm text-destructive">
                        Could not load users
                        {usersQueryError instanceof Error ? `: ${usersQueryError.message}` : "."}
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((row) => {
                    const isSelf = row.user_id === user?.id;
                    const lastSuper = row.role === "super_admin" && superAdminCount <= 1;
                    return (
                      <tr key={row.user_id} className="border-t transition-colors hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-medium text-[#0B192C]">
                            {row.name}
                            {isSelf ? (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                            {row.is_disabled ? (
                              <Badge variant="secondary" className="ml-2 align-middle text-[10px] uppercase tracking-wide">
                                Disabled
                              </Badge>
                            ) : null}
                          </div>
                          {row.phone && (
                            <div className="text-xs text-muted-foreground">{row.phone}</div>
                          )}
                        </td>
                        <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">
                          {row.email || "—"}
                        </td>
                        <td className="p-3">
                          <RoleBadge role={row.role} />
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                Actions
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                disabled={lastSuper && isSelf}
                                onClick={() =>
                                  setPending({
                                    userId: row.user_id,
                                    email: row.email,
                                    role: row.role,
                                    name: row.name,
                                    current: row.role,
                                  })
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Change role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {row.is_disabled ? (
                                <DropdownMenuItem
                                  disabled={isSelf}
                                  onClick={() => {
                                    setRemovalConfirm("");
                                    setRemoval({
                                      userId: row.user_id,
                                      email: row.email,
                                      name: row.name,
                                      mode: "restore",
                                    });
                                  }}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Restore access
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  disabled={isSelf || lastSuper}
                                  onClick={() => {
                                    setRemovalConfirm("");
                                    setRemoval({
                                      userId: row.user_id,
                                      email: row.email,
                                      name: row.name,
                                      mode: "disable",
                                    });
                                  }}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Disable login
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={isSelf || lastSuper}
                                onClick={() => {
                                  setRemovalConfirm("");
                                  setRemoval({
                                    userId: row.user_id,
                                    email: row.email,
                                    name: row.name,
                                    mode: "delete",
                                  });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {!loadingUsers && !usersError && !filteredUsers.length && (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-muted-foreground">
                        {search ? "No users match your search." : "No registered users found."}
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
            title="Active vendor shops"
            description="Live shops on SmartZone. Add a seller whose account already exists, or approve an application below."
            actions={
              <Button
                className="min-h-[44px] gap-2 bg-[#FF7A00] hover:bg-[#E56E00] text-white"
                onClick={() => setAddVendorOpen(true)}
              >
                <Plus className="h-4 w-4" /> Add vendor
              </Button>
            }
          >
            <ResponsiveScroll>
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-3 font-semibold">Shop</th>
                    <th className="p-3 font-semibold">Account</th>
                    <th className="p-3 font-semibold">Commission</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVendorShops && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Loading vendor shops…
                      </td>
                    </tr>
                  )}
                  {vendorShopsError && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-destructive">
                        Could not load shops
                        {vendorShopsQueryError instanceof Error
                          ? `: ${vendorShopsQueryError.message}`
                          : "."}
                      </td>
                    </tr>
                  )}
                  {(vendorShopsData ?? []).map((shop: VendorShopRow) => {
                    const account = emailByUserId.get(shop.user_id);
                    return (
                      <tr key={shop.id} className="border-t transition-colors hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-bold">
                            <Store className="h-4 w-4 text-[#FF7A00]" /> {shop.shop_name}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            /{shop.slug}
                          </div>
                        </td>
                        <td className="p-3 text-xs">
                          <div className="font-medium text-foreground">
                            {account?.name || shop.user_id.slice(0, 8)}
                          </div>
                          <div className="text-muted-foreground">{account?.email || "—"}</div>
                        </td>
                        <td className="p-3 text-sm font-semibold">{shop.commission_pct}%</td>
                        <td className="p-3">
                          <Badge variant={shop.is_active ? "default" : "outline"} className="text-xs">
                            {shop.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 px-3"
                              disabled={saving}
                              onClick={() => void toggleVendorShop(shop)}
                            >
                              {shop.is_active ? (
                                <>
                                  <Ban className="h-3.5 w-3.5" /> Disable
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" /> Enable
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 gap-1 px-3"
                              disabled={saving}
                              onClick={() => void removeVendorShop(shop)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loadingVendorShops && !vendorShopsError && !(vendorShopsData ?? []).length && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No vendor shops yet. Use Add vendor or approve an application.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ResponsiveScroll>
          </SectionCard>

          <SectionCard
            title="Seller applications"
            description="Public registrations from Seller Center. Approve to grant Vendor role and create the shop with the submitted name."
          >
            <ResponsiveScroll>
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-3 font-semibold">Shop</th>
                    <th className="p-3 font-semibold">Contact</th>
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
                  {vendorAppsError && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm text-destructive">
                        Could not load applications
                        {vendorAppsQueryError instanceof Error
                          ? `: ${vendorAppsQueryError.message}`
                          : "."}
                      </td>
                    </tr>
                  )}
                  {(vendorAppsData ?? []).map((app) => (
                    <tr key={app.id} className="border-t transition-colors hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Store className="h-4 w-4 text-[#FF7A00]" /> {app.shop_name}
                        </div>
                        <div className="mt-0.5 max-w-xs line-clamp-2 text-xs text-muted-foreground">
                          {app.description || "No description provided."}
                        </div>
                      </td>
                      <td className="space-y-0.5 p-3 text-xs">
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
                          className="text-xs capitalize"
                        >
                          {app.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8 gap-1 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                                disabled={saving}
                                onClick={() => void approveVendorApplication(app)}
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 gap-1 px-3"
                                disabled={saving}
                                onClick={() => void rejectVendorApplication(app)}
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground capitalize">{app.status}</span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 px-3"
                            disabled={saving}
                            onClick={() => void removeVendorApplication(app)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loadingVendorApps && !vendorAppsError && !(vendorAppsData ?? []).length && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No seller applications yet.
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
            title="Access log"
            description="Role changes and account disable, restore, or delete actions."
            actions={
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={saving || !(auditLogsData ?? []).length}
                onClick={() => void clearAuditLogs()}
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </Button>
            }
          >
            <ResponsiveScroll>
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-3 font-semibold">When</th>
                    <th className="p-3 font-semibold">Actor</th>
                    <th className="p-3 font-semibold">Change</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditLogsData ?? []).map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <RoleBadge role={(log.actor_role as AppRole) || "user"} />
                      </td>
                      <td className="p-3 text-xs font-semibold">
                        {log.action === "USER_DISABLE" ||
                        log.action === "USER_RESTORE" ||
                        log.action === "USER_DELETE" ? (
                          <span className="capitalize">
                            {log.action === "USER_DISABLE"
                              ? "Disabled login"
                              : log.action === "USER_RESTORE"
                                ? "Restored access"
                                : "Deleted account"}
                            {log.old_role ? ` (${log.old_role} → ${log.new_role})` : ""}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <RoleBadge role={(log.old_role as AppRole) || "user"} />
                            <span>→</span>
                            <RoleBadge role={(log.new_role as AppRole) || "user"} />
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive"
                          disabled={saving}
                          onClick={() => void deleteAuditLog(log.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!(auditLogsData ?? []).length && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No role changes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ResponsiveScroll>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Dialog open={!!pending} onOpenChange={(open) => !open && !saving && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B192C]">
              <Crown className="h-5 w-5 text-[#FF7A00]" />
              Change role
            </DialogTitle>
            <DialogDescription>
              Assign a workspace role to <strong>{pending?.name}</strong>
              {pending?.email ? ` (${pending.email})` : ""}. This updates the live account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Role</Label>
            <Select
              value={pending?.role}
              onValueChange={(value) =>
                pending && setPending({ ...pending, role: value as AppRole })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_CATALOG[role].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pending?.role === "vendor" && (
              <p className="text-xs text-muted-foreground">A vendor shop record is created if missing.</p>
            )}
            {pending?.role === "super_admin" && (
              <p className="text-xs text-amber-700">This grants full platform access, including this page.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0B192C] hover:bg-[#0F2C59]"
              disabled={saving || pending?.role === pending?.current}
              onClick={() => void applyPending()}
            >
              {saving ? "Saving…" : "Save role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!removal}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setRemoval(null);
            setRemovalConfirm("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B192C]">
              {removal?.mode === "delete" ? (
                <Trash2 className="h-5 w-5 text-destructive" />
              ) : removal?.mode === "restore" ? (
                <RotateCcw className="h-5 w-5 text-[#FF7A00]" />
              ) : (
                <Ban className="h-5 w-5 text-[#FF7A00]" />
              )}
              {removal?.mode === "delete"
                ? "Delete account"
                : removal?.mode === "restore"
                  ? "Restore access"
                  : "Disable login"}
            </DialogTitle>
            <DialogDescription>
              {removal?.mode === "delete"
                ? `${removal.name} (${removal.email}) will be permanently removed. Orders stay in history without this customer link. They cannot sign in again.`
                : removal?.mode === "restore"
                  ? `${removal?.name} will be able to sign in again. A vendor shop is reactivated only if they still have the vendor role.`
                  : `${removal?.name} (${removal?.email}) will be blocked from signing in immediately. Orders stay in history. You can restore access later.`}
            </DialogDescription>
          </DialogHeader>
          {removal?.mode !== "restore" && (
            <div className="space-y-1.5 py-2">
              <Label htmlFor="remove-confirm">Type their email to confirm</Label>
              <Input
                id="remove-confirm"
                autoComplete="off"
                value={removalConfirm}
                onChange={(e) => setRemovalConfirm(e.target.value)}
                placeholder={removal?.email}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                setRemoval(null);
                setRemovalConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              className={
                removal?.mode === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-[#0B192C] hover:bg-[#0F2C59]"
              }
              disabled={
                saving ||
                (removal?.mode !== "restore" &&
                  removalConfirm.trim().toLowerCase() !== (removal?.email ?? "").trim().toLowerCase())
              }
              onClick={() => void applyRemoval()}
            >
              {saving
                ? "Working…"
                : removal?.mode === "delete"
                  ? "Delete permanently"
                  : removal?.mode === "restore"
                    ? "Restore access"
                    : "Disable login"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-[#FF7A00]" /> Assign role by email
            </DialogTitle>
            <DialogDescription>
              They must already have a SmartZone account. Then assign Admin, Vendor, or Super Admin
              here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Account email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="create-email"
                  type="email"
                  placeholder="ops@smartzone.pk"
                  className="pl-9"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_CATALOG[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2 bg-[#FF7A00] hover:bg-[#E56E00] text-white">
                Continue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addVendorOpen} onOpenChange={(open) => !addingVendor && setAddVendorOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Store className="h-5 w-5 text-[#FF7A00]" /> Add vendor shop
            </DialogTitle>
            <DialogDescription>
              The seller must already have a SmartZone account. This assigns the Vendor role and
              creates the shop with the name and commission you enter.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddVendor} className="space-y-4 py-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="vendor-email">Account email *</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  placeholder="seller@company.pk"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="vendor-shop">Shop name *</Label>
                <Input
                  id="vendor-shop"
                  placeholder="Apex Automation Store"
                  value={newVendor.shopName}
                  onChange={(e) => setNewVendor({ ...newVendor, shopName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-phone">Phone / WhatsApp</Label>
                <Input
                  id="vendor-phone"
                  placeholder="+92 300 1234567"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-cnic">CNIC / NTN</Label>
                <Input
                  id="vendor-cnic"
                  placeholder="42101-XXXXXXX-X"
                  value={newVendor.cnic}
                  onChange={(e) => setNewVendor({ ...newVendor, cnic: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-commission">Commission %</Label>
                <Input
                  id="vendor-commission"
                  type="number"
                  min={0}
                  max={40}
                  step={0.5}
                  value={newVendor.commission}
                  onChange={(e) => setNewVendor({ ...newVendor, commission: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="vendor-notes">Internal notes</Label>
                <Textarea
                  id="vendor-notes"
                  rows={3}
                  placeholder="Optional: catalog focus, agreement terms…"
                  value={newVendor.notes}
                  onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If there is no account for that email, ask them to register at Seller Center
              (/vendor/auth) first — invites are not sent from this form.
            </p>
            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={addingVendor}
                onClick={() => setAddVendorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addingVendor}
                className="gap-2 bg-[#FF7A00] hover:bg-[#E56E00] text-white"
              >
                {addingVendor ? "Adding…" : "Create vendor shop"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
