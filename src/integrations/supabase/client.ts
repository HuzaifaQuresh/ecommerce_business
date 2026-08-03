import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { MOCK_PRODUCTS } from "@/lib/mock-catalog";
import { MOCK_SITE_SETTINGS, MOCK_VOUCHERS, MOCK_ORDERS } from "@/lib/mock-data";

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (
    url.includes("placeholder") ||
    url.includes("your-supabase-id") ||
    url.includes("xyz") ||
    !url.startsWith("https://")
  ) {
    return false;
  }
  // The key must also look like a real anon/publishable key, not a leftover
  // placeholder such as "your-anon-key" — otherwise we'd think Supabase is
  // configured and silently use a bogus key for every request.
  if (
    key.includes("your-anon-key") ||
    key.includes("your-publishable-key") ||
    key.includes("placeholder") ||
    key.length < 20
  ) {
    return false;
  }
  return true;
}

function createSupabaseClient() {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "placeholder-key";

  return createClient<Database>(url, key, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

const isClient = typeof window !== "undefined";

export const DEFAULT_DEMO_ACCOUNTS = [
  {
    email: "huzaifaqur67@gmail.com",
    password: "password123",
    full_name: "Muhammad Huzaifa (Super Admin)",
    role: "super_admin",
  },
  {
    email: "superadmin@nexus.pk",
    password: "password123",
    full_name: "Muhammad Huzaifa (Super Admin)",
    role: "super_admin",
  },
  {
    email: "admin@nexus.pk",
    password: "password123",
    full_name: "Sarah Khan (Platform Admin)",
    role: "admin",
  },
  {
    email: "vendor@nexus.pk",
    password: "password123",
    full_name: "Ali Raza (IoT Vendor)",
    role: "vendor",
  },
  {
    email: "user@nexus.pk",
    password: "password123",
    full_name: "Zainab Fatima (Customer)",
    role: "user",
  },
];

function getRegisteredAccounts() {
  const customStr = isClient ? localStorage.getItem("nexus_registered_users") : null;
  let customAccounts: any[] = [];
  if (customStr) {
    try {
      customAccounts = JSON.parse(customStr);
    } catch {
      // ignore
    }
  }
  return [...DEFAULT_DEMO_ACCOUNTS, ...customAccounts];
}

function getActiveAuthUser() {
  if (!isClient) return null;
  const localUserStr = localStorage.getItem("nexus_local_user");
  if (localUserStr) {
    try {
      const parsed = JSON.parse(localUserStr);
      if (parsed && parsed.email) {
        return {
          id: parsed.id || "local-user-123",
          email: parsed.email,
          full_name: parsed.full_name || parsed.email.split("@")[0],
          role: parsed.role || "user",
        };
      }
    } catch {
      // ignore JSON error
    }
  }
  const demoRole = localStorage.getItem("nexus_demo_role");
  if (demoRole) {
    return {
      id: "demo-user-id-1234-5678",
      email: `${demoRole}@nexusiot.pk`,
      full_name:
        demoRole === "super_admin"
          ? "Muhammad Huzaifa (Super Admin)"
          : demoRole === "admin"
            ? "Sarah Khan (Platform Admin)"
            : demoRole === "vendor"
              ? "Ali Raza (IoT Vendor)"
              : "Zainab Fatima (Customer)",
      role: demoRole,
    };
  }
  return null;
}

function getAllMockUsers(activeUser: any) {
  const accounts = getRegisteredAccounts();
  const roleOverridesStr = isClient ? localStorage.getItem("nexus_user_roles") : null;
  let roleOverrides: Record<string, string> = {};
  if (roleOverridesStr) {
    try {
      roleOverrides = JSON.parse(roleOverridesStr);
    } catch {
      // ignore
    }
  }

  const userMap = new Map<string, any>();

  for (const acc of accounts) {
    let uid = acc.id;
    if (!uid) {
      if (acc.email.includes("superadmin") || acc.email.includes("huzaifaqur")) {
        uid = "usr-superadmin";
      } else if (acc.email.includes("admin")) {
        uid = "usr-admin";
      } else if (acc.email.includes("vendor")) {
        uid = "usr-vendor";
      } else if (acc.email.includes("user")) {
        uid = "usr-customer";
      } else {
        uid = "usr-" + acc.email.replace(/[^a-zA-Z0-9]/g, "");
      }
    }

    if (
      activeUser &&
      (activeUser.id === uid || activeUser.email?.toLowerCase() === acc.email?.toLowerCase())
    ) {
      uid = activeUser.id;
    }

    let role = acc.role || "user";
    if (roleOverrides[uid]) {
      role = roleOverrides[uid];
    } else if (acc.email && roleOverrides[acc.email]) {
      role = roleOverrides[acc.email];
    } else if (acc.email && roleOverrides[acc.email.toLowerCase()]) {
      role = roleOverrides[acc.email.toLowerCase()];
    } else if (activeUser && activeUser.id === uid && activeUser.role) {
      role = activeUser.role;
    }

    userMap.set(uid, {
      id: uid,
      email: acc.email,
      full_name: acc.full_name || acc.email.split("@")[0],
      phone: acc.phone || "+92 332 3059259",
      role,
    });
  }

  if (activeUser && !userMap.has(activeUser.id)) {
    let role = activeUser.role || "user";
    if (roleOverrides[activeUser.id]) role = roleOverrides[activeUser.id];
    else if (roleOverrides[activeUser.email]) role = roleOverrides[activeUser.email];

    userMap.set(activeUser.id, {
      id: activeUser.id,
      email: activeUser.email,
      full_name: activeUser.full_name || activeUser.email?.split("@")[0] || "Active User",
      phone: "+92 332 3059259",
      role,
    });
  }

  return Array.from(userMap.values());
}

function getMockTableData(table: string, activeUser: any) {
  if (table === "products") {
    const custom = isClient ? JSON.parse(localStorage.getItem("nexus_products") || "null") : null;
    return custom || MOCK_PRODUCTS;
  }
  if (table === "vouchers") {
    const custom = isClient ? JSON.parse(localStorage.getItem("nexus_vouchers") || "null") : null;
    return custom || MOCK_VOUCHERS;
  }
  if (table === "orders") {
    const custom = isClient
      ? JSON.parse(
          localStorage.getItem("nexus_orders") ||
            localStorage.getItem("nexus_local_orders") ||
            "null",
        )
      : null;
    if (custom && Array.isArray(custom)) {
      const merged = [...custom];
      for (const mo of MOCK_ORDERS) {
        if (!merged.some((o: any) => o.id === mo.id)) {
          merged.push(mo);
        }
      }
      return merged;
    }
    return MOCK_ORDERS;
  }
  if (table === "order_items") {
    const custom = isClient
      ? JSON.parse(localStorage.getItem("nexus_order_items") || "null")
      : null;
    if (custom && Array.isArray(custom)) return custom;
    const orders = isClient
      ? JSON.parse(
          localStorage.getItem("nexus_orders") ||
            localStorage.getItem("nexus_local_orders") ||
            "[]",
        )
      : [];
    const allItems: any[] = [];
    for (const o of orders) {
      if (o.items && Array.isArray(o.items)) {
        allItems.push(...o.items);
      }
    }
    const defaultItems = MOCK_ORDERS_WITH_ITEMS.flatMap((o) => o.items || []);
    for (const di of defaultItems) {
      if (!allItems.some((i: any) => i.id === di.id)) {
        allItems.push(di);
      }
    }
    return allItems;
  }
  if (table === "site_settings") {
    const custom = isClient ? JSON.parse(localStorage.getItem("nexus_site_settings") || "{}") : {};
    const merged = { ...MOCK_SITE_SETTINGS, ...custom };
    return Object.entries(merged).map(([k, v]) => ({ key: k, value: v }));
  }
  if (table === "user_roles") {
    const allUsers = getAllMockUsers(activeUser);
    return allUsers.map((u) => ({ user_id: u.id, role: u.role }));
  }
  if (table === "vendors") {
    if (!activeUser) return [];
    return [
      {
        id: "demo-vendor-id-1234",
        user_id: activeUser.id,
        shop_name: "Demo IoT Store",
        slug: "demo-iot-store",
        commission_pct: 10,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];
  }
  if (table === "profiles") {
    const allUsers = getAllMockUsers(activeUser);
    return allUsers.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }
  if (table === "vendor_applications") {
    if (!isClient) return [];
    return JSON.parse(localStorage.getItem("nexus_vendor_apps") || "[]");
  }
  if (table === "product_reviews") {
    if (!isClient) return [];
    return JSON.parse(localStorage.getItem("nexus_all_reviews") || "[]");
  }
  return [];
}

function createMockQueryBuilder(initialData: any, table?: string) {
  let dataset = Array.isArray(initialData) ? [...initialData] : initialData;
  const filters: { column: string; value: any }[] = [];

  const applyFilters = (data: any[]) => {
    let result = [...data];
    for (const f of filters) {
      result = result.filter((item: any) => {
        if (!item || item[f.column] === undefined) return false;
        return String(item[f.column]).toLowerCase() === String(f.value).toLowerCase();
      });
    }
    return result;
  };

  const persistDataset = (updatedDataset: any[]) => {
    if (!isClient || !table) return;
    if (table === "site_settings") {
      const map: Record<string, any> = {};
      for (const row of updatedDataset) {
        if (row && row.key) map[row.key] = row.value;
      }
      localStorage.setItem("nexus_site_settings", JSON.stringify(map));
      window.dispatchEvent(new Event("nexus-settings-update"));
    } else if (table === "vouchers") {
      localStorage.setItem("nexus_vouchers", JSON.stringify(updatedDataset));
      window.dispatchEvent(new Event("nexus-vouchers-update"));
    } else if (table === "products") {
      localStorage.setItem("nexus_products", JSON.stringify(updatedDataset));
      window.dispatchEvent(new Event("nexus-products-update"));
    } else if (table === "orders") {
      localStorage.setItem("nexus_orders", JSON.stringify(updatedDataset));
      localStorage.setItem("nexus_local_orders", JSON.stringify(updatedDataset));
      window.dispatchEvent(new Event("nexus-orders-update"));
    } else if (table === "order_items") {
      localStorage.setItem("nexus_order_items", JSON.stringify(updatedDataset));
    } else if (table === "product_reviews") {
      localStorage.setItem("nexus_all_reviews", JSON.stringify(updatedDataset));
    }
  };

  const builder: any = {
    select: () => builder,
    eq: (column: string, value: any) => {
      filters.push({ column, value });
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => {
          if (!item || item[column] === undefined) return false;
          return String(item[column]).toLowerCase() === String(value).toLowerCase();
        });
      }
      return builder;
    },
    neq: (column: string, value: any) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => {
          if (!item || item[column] === undefined) return true;
          return String(item[column]).toLowerCase() !== String(value).toLowerCase();
        });
      }
      return builder;
    },
    in: (column: string, values: any[]) => {
      if (Array.isArray(dataset)) {
        const lowerVals = (values || []).map((v) => String(v).toLowerCase());
        dataset = dataset.filter((item: any) => {
          if (!item || item[column] === undefined) return false;
          return lowerVals.includes(String(item[column]).toLowerCase());
        });
      }
      return builder;
    },
    limit: (n: number) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.slice(0, n);
      }
      return builder;
    },
    order: (column: string, opts?: { ascending?: boolean }) => {
      if (Array.isArray(dataset)) {
        const asc = opts?.ascending !== false;
        dataset = [...dataset].sort((a: any, b: any) => {
          const valA = a[column];
          const valB = b[column];
          if (valA < valB) return asc ? -1 : 1;
          if (valA > valB) return asc ? 1 : -1;
          return 0;
        });
      }
      return builder;
    },
    range: (from: number, to: number) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.slice(from, to + 1);
      }
      return builder;
    },
    match: (obj: Record<string, any>) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => {
          return Object.entries(obj).every(
            ([k, v]) => String(item[k]).toLowerCase() === String(v).toLowerCase(),
          );
        });
      }
      return builder;
    },
    filter: () => builder,
    or: () => builder,
    and: () => builder,
    gte: (column: string, value: any) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => item && item[column] >= value);
      }
      return builder;
    },
    lte: (column: string, value: any) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => item && item[column] <= value);
      }
      return builder;
    },
    gt: (column: string, value: any) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => item && item[column] > value);
      }
      return builder;
    },
    lt: (column: string, value: any) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => item && item[column] < value);
      }
      return builder;
    },
    contains: (column: string, value: any) => {
      if (Array.isArray(dataset)) {
        dataset = dataset.filter((item: any) => {
          if (!item) return false;
          const field = item[column];
          if (Array.isArray(field)) {
            return field.includes(value);
          }
          return String(field).toLowerCase().includes(String(value).toLowerCase());
        });
      }
      return builder;
    },
    upsert: async (payload: any) => {
      let baseData = getMockTableData(table || "", null);
      if (!Array.isArray(baseData)) baseData = [];
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        if (table === "site_settings") {
          const idx = baseData.findIndex((r: any) => r.key === item.key);
          if (idx >= 0) {
            baseData[idx] = { ...baseData[idx], ...item };
          } else {
            baseData.push(item);
          }
        } else {
          const idx = baseData.findIndex((r: any) => r.id && item.id && r.id === item.id);
          if (idx >= 0) {
            baseData[idx] = { ...baseData[idx], ...item };
          } else {
            baseData.push({ id: "item-" + Math.random().toString(36).substring(2, 9), ...item });
          }
        }
      }
      persistDataset(baseData);
      dataset = baseData;
      return { data: null, error: null };
    },
    insert: async (payload: any) => {
      let baseData = getMockTableData(table || "", null);
      if (!Array.isArray(baseData)) baseData = [];
      const items = Array.isArray(payload) ? payload : [payload];
      const inserted = items.map((item) => ({
        id: item.id || "item-" + Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        ...item,
      }));
      baseData = [...inserted, ...baseData];
      persistDataset(baseData);
      dataset = baseData;
      return { data: inserted, error: null };
    },
    update: async (payload: any) => {
      let baseData = getMockTableData(table || "", null);
      if (!Array.isArray(baseData)) baseData = [];

      baseData = baseData.map((item: any) => {
        let matches = true;
        for (const f of filters) {
          if (!item || String(item[f.column]).toLowerCase() !== String(f.value).toLowerCase()) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return { ...item, ...payload, updated_at: new Date().toISOString() };
        }
        return item;
      });

      persistDataset(baseData);
      dataset = applyFilters(baseData);
      return { data: null, error: null };
    },
    delete: async () => {
      let baseData = getMockTableData(table || "", null);
      if (!Array.isArray(baseData)) baseData = [];

      baseData = baseData.filter((item: any) => {
        for (const f of filters) {
          if (item && String(item[f.column]).toLowerCase() === String(f.value).toLowerCase()) {
            return false;
          }
        }
        return true;
      });

      persistDataset(baseData);
      dataset = applyFilters(baseData);
      return { data: null, error: null };
    },
    maybeSingle: async () => ({
      data: Array.isArray(dataset) ? (dataset[0] ?? null) : dataset,
      error: null,
    }),
    single: async () => ({
      data: Array.isArray(dataset) ? (dataset[0] ?? null) : dataset,
      error: null,
    }),
    then: (resolve: any) => resolve({ data: dataset, error: null }),
  };
  return builder as any;
}

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    const configured = isSupabaseConfigured();
    const activeUser = getActiveAuthUser();

    if (prop === "auth") {
      const originalAuth = _supabase.auth;
      const mockUser = activeUser
        ? {
            id: activeUser.id,
            aud: "authenticated",
            role: "authenticated",
            email: activeUser.email,
            email_confirmed_at: new Date().toISOString(),
            phone: "+92 332 3059259",
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {
              full_name: activeUser.full_name,
            },
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : null;

      const mockSession = mockUser
        ? {
            access_token: "mock-token",
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "mock-refresh-token",
            user: mockUser,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }
        : null;

      return {
        getSession: async () => {
          if (mockSession) return { data: { session: mockSession }, error: null };
          if (configured) {
            try {
              return await originalAuth.getSession();
            } catch {
              return { data: { session: null }, error: null };
            }
          }
          return { data: { session: null }, error: null };
        },
        getUser: async () => {
          if (mockUser) return { data: { user: mockUser }, error: null };
          if (configured) {
            try {
              return await originalAuth.getUser();
            } catch {
              return { data: { user: null }, error: null };
            }
          }
          return { data: { user: null }, error: null };
        },
        onAuthStateChange: (callback: any) => {
          if (mockSession) {
            callback("SIGNED_IN", mockSession);
          } else {
            callback("SIGNED_OUT", null);
          }

          const handler = () => {
            const updatedUser = getActiveAuthUser();
            if (updatedUser) {
              const updatedMockUser = {
                id: updatedUser.id,
                aud: "authenticated",
                role: "authenticated",
                email: updatedUser.email,
                email_confirmed_at: new Date().toISOString(),
                phone: "+92 332 3059259",
                user_metadata: { full_name: updatedUser.full_name },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              callback("SIGNED_IN", {
                access_token: "mock-token",
                token_type: "bearer",
                expires_in: 3600,
                refresh_token: "mock-refresh-token",
                user: updatedMockUser,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              });
            } else {
              callback("SIGNED_OUT", null);
            }
          };

          if (isClient) window.addEventListener("nexus-auth-update", handler);

          let origSub: any = null;
          if (configured) {
            try {
              const { data } = originalAuth.onAuthStateChange(callback);
              origSub = data.subscription;
            } catch {
              // ignore
            }
          }

          return {
            data: {
              subscription: {
                unsubscribe() {
                  if (isClient) window.removeEventListener("nexus-auth-update", handler);
                  if (origSub) origSub.unsubscribe();
                },
              },
            },
          };
        },
        signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
          const em = (email || "").trim().toLowerCase();
          const pw = password || "";

          // When Supabase is properly configured, always authenticate for
          // real instead of using the local demo fallback — otherwise any
          // password would silently "work" for emails that happen to match
          // a demo account.
          if (configured) {
            try {
              const res = await originalAuth.signInWithPassword({ email: em, password: pw });
              if (res.error && res.error.message.toLowerCase().includes("failed to fetch")) {
                return {
                  data: { user: null, session: null },
                  error: new Error(
                    "Could not reach Supabase. Check your internet connection and Supabase project status.",
                  ),
                };
              }
              return res;
            } catch (err: any) {
              return {
                data: { user: null, session: null },
                error: new Error(err?.message || "Invalid login credentials"),
              };
            }
          }

          const accounts = getRegisteredAccounts();
          let found = accounts.find((a) => a.email.toLowerCase() === em);

          // If not found in accounts, dynamically register if local/demo mode
          if (!found) {
            let role = "user";
            if (
              em.includes("huzaifaqur") ||
              em.includes("super_admin") ||
              em.includes("superadmin")
            ) {
              role = "super_admin";
            } else if (em.includes("admin")) {
              role = "admin";
            } else if (em.includes("vendor")) {
              role = "vendor";
            }

            found = {
              id: "usr-" + Math.random().toString(36).substring(2, 9),
              email: em,
              password: pw,
              full_name: em.includes("huzaifaqur")
                ? "Muhammad Huzaifa (Super Admin)"
                : em.split("@")[0],
              role,
            };

            if (isClient) {
              const customStr = localStorage.getItem("nexus_registered_users");
              const registered = customStr ? JSON.parse(customStr) : [];
              registered.push(found);
              localStorage.setItem("nexus_registered_users", JSON.stringify(registered));
            }
          }

          // If found in local/demo accounts, perform local authentication
          if (found) {
            let userRole = found.role || "user";
            if (isClient) {
              const roleOverridesStr = localStorage.getItem("nexus_user_roles");
              if (roleOverridesStr) {
                try {
                  const overrides = JSON.parse(roleOverridesStr);
                  if (overrides[found.id]) userRole = overrides[found.id];
                  else if (found.email && overrides[found.email]) userRole = overrides[found.email];
                  else if (found.email && overrides[found.email.toLowerCase()]) {
                    userRole = overrides[found.email.toLowerCase()];
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Update password in local account if given
            if (isClient && found.password !== pw) {
              found.password = pw;
            }

            const localUser = {
              id:
                found.id ||
                (userRole === "super_admin" || em.includes("huzaifaqur")
                  ? "usr-superadmin"
                  : "usr-" + Math.random().toString(36).substring(2, 9)),
              email: found.email,
              full_name: found.full_name || found.email.split("@")[0],
              role: userRole,
            };
            if (isClient) {
              localStorage.removeItem("nexus_demo_role");
              localStorage.setItem("nexus_local_user", JSON.stringify(localUser));
              window.dispatchEvent(new Event("nexus-auth-update"));
            }
            return {
              data: {
                user: localUser,
                session: {
                  access_token: "mock-token",
                  token_type: "bearer",
                  expires_in: 3600,
                  refresh_token: "mock-refresh-token",
                  user: localUser,
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                },
              },
              error: null,
            };
          }

          // Not in local accounts — try remote Supabase if configured
          if (configured) {
            try {
              const res = await originalAuth.signInWithPassword({ email: em, password: pw });
              if (res.error && res.error.message.toLowerCase().includes("failed to fetch")) {
                return {
                  data: { user: null, session: null },
                  error: new Error("Invalid login credentials"),
                };
              }
              return res;
            } catch (err: any) {
              return {
                data: { user: null, session: null },
                error: new Error(err?.message || "Invalid login credentials"),
              };
            }
          }

          return {
            data: { user: null, session: null },
            error: new Error("Invalid login credentials"),
          };
        },
        signUp: async ({ email, password, options }: any) => {
          const em = (email || "").trim().toLowerCase();
          const pw = password || "";
          const accounts = getRegisteredAccounts();
          const existing = accounts.find((a) => a.email.toLowerCase() === em);

          if (existing) {
            return {
              data: { user: null, session: null },
              error: new Error("User already registered"),
            };
          }

          // Try real Supabase if configured
          if (configured) {
            try {
              const res = await originalAuth.signUp({ email: em, password: pw, options });
              if (!res.error) return res;
              if (!res.error.message.toLowerCase().includes("failed to fetch")) {
                return res;
              }
            } catch {
              // fall through to local registration on network failure
            }
          }

          let role = "user";
          if (em.includes("super_admin") || em.includes("superadmin")) role = "super_admin";
          else if (em.includes("admin")) role = "admin";
          else if (em.includes("vendor")) role = "vendor";

          const newAccount = {
            id: "usr-" + Math.random().toString(36).substring(2, 9),
            email: em,
            password: pw,
            full_name: options?.data?.full_name || em.split("@")[0],
            role,
          };

          if (isClient) {
            const customStr = localStorage.getItem("nexus_registered_users");
            const registered = customStr ? JSON.parse(customStr) : [];
            registered.push(newAccount);
            localStorage.setItem("nexus_registered_users", JSON.stringify(registered));

            localStorage.removeItem("nexus_demo_role");
            localStorage.setItem("nexus_local_user", JSON.stringify(newAccount));
            window.dispatchEvent(new Event("nexus-auth-update"));
          }

          return {
            data: {
              user: newAccount,
              session: {
                access_token: "mock-token",
                token_type: "bearer",
                expires_in: 3600,
                refresh_token: "mock-refresh-token",
                user: newAccount,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              },
            },
            error: null,
          };
        },
        signOut: async () => {
          if (isClient) {
            localStorage.removeItem("nexus_demo_role");
            localStorage.removeItem("nexus_local_user");
            window.dispatchEvent(new Event("nexus-auth-update"));
          }
          try {
            if (configured) await originalAuth.signOut();
          } catch {
            // ignore
          }
          return { error: null };
        },
        signInWithOAuth: async ({ provider, options }: any) => {
          if (configured) {
            // Real Supabase project: let the real OAuth flow run and report
            // real errors (e.g. the Google provider not being enabled in the
            // Supabase dashboard, or the redirect URL not being whitelisted)
            // instead of masking them with a fake local session.
            try {
              return await originalAuth.signInWithOAuth({ provider, options });
            } catch (err: any) {
              return {
                data: { provider, url: "" },
                error: new Error(err?.message || "Failed to sign in with Google"),
              };
            }
          }
          if (isClient) {
            const googleUser = {
              id: "usr-google-" + Math.random().toString(36).substring(2, 9),
              email: "google_user@nexus.pk",
              full_name: "Google User",
              role: "user",
            };
            localStorage.setItem("nexus_local_user", JSON.stringify(googleUser));
            window.dispatchEvent(new Event("nexus-auth-update"));

            const redirectTo = options?.redirectTo || window.location.origin + "/account";
            window.location.href = redirectTo;
          }
          return { data: { provider, url: "" }, error: null };
        },
        resetPasswordForEmail: async () => ({ data: {}, error: null }),
        updateUser: async () => ({ data: {}, error: null }),
      };
    }

    if (prop === "from") {
      return (table: string) => {
        const tableData = getMockTableData(table, activeUser);
        return createMockQueryBuilder(tableData, table);
      };
    }

    if (prop === "rpc") {
      if (!configured || activeUser) {
        return async () => ({ data: null, error: null });
      }
    }

    return Reflect.get(_supabase || {}, prop, receiver);
  },
});
