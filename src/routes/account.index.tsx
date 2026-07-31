import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/site/PageLayout";
import { RoleAccessGrid } from "@/components/dashboard/RoleAccessGrid";
import { primaryRole, ROLE_CATALOG } from "@/lib/roles";
import { PK_PROVINCES } from "@/lib/pakistan-address";
import { toast } from "sonner";
import { Shield, Mail, Phone, User, MapPin, Crown } from "lucide-react";

export const Route = createFileRoute("/account/")({ component: AccountProfile });

function AccountProfile() {
  const { user, roles } = useAuth();
  const primary = primaryRole(roles.length ? roles : ["user"]);
  const meta = ROLE_CATALOG[primary];

  const { data, refetch } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: String(fd.get("name")).trim(),
        phone: String(fd.get("phone")).trim(),
      })
      .eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refetch();
  };

  const saveAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("profiles")
      .update({
        address: String(fd.get("address")).trim(),
        city: String(fd.get("city")).trim(),
        province: String(fd.get("province")).trim(),
        postal_code: String(fd.get("postal_code")).trim() || null,
        landmark: String(fd.get("landmark")).trim() || null,
      })
      .eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Default address saved");
    refetch();
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Profile details">
        <form onSubmit={saveProfile} className="space-y-4 max-w-lg">
          <div>
            <Label className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </Label>
            <Input value={user?.email ?? ""} disabled className="mt-1.5" />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Full name
            </Label>
            <Input
              name="name"
              defaultValue={data?.full_name ?? ""}
              className="mt-1.5"
              placeholder="Muhammad Huzaifa"
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone
            </Label>
            <Input
              name="phone"
              defaultValue={data?.phone ?? ""}
              placeholder="+92 332 3059259"
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="min-h-[44px]">
            Save profile
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Default shipping address">
        <p className="text-sm text-muted-foreground mb-4">
          Saved here and pre-filled automatically at checkout.
        </p>
        <form key={data?.id} onSubmit={saveAddress} className="space-y-4 max-w-lg">
          <div>
            <Label className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Street address
            </Label>
            <Textarea
              name="address"
              defaultValue={(data as any)?.address ?? ""}
              placeholder="House / plot, street, area"
              rows={2}
              className="mt-1.5"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input
                name="city"
                defaultValue={(data as any)?.city ?? ""}
                placeholder="Islamabad"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Province</Label>
              <Select
                name="province"
                defaultValue={(data as any)?.province ?? "Islamabad Capital Territory"}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {PK_PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Postal code (optional)</Label>
              <Input
                name="postal_code"
                defaultValue={(data as any)?.postal_code ?? ""}
                placeholder="44000"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Landmark (optional)</Label>
              <Input
                name="landmark"
                defaultValue={(data as any)?.landmark ?? ""}
                placeholder="Near Packages Mall"
                className="mt-1.5"
              />
            </div>
          </div>
          <Button type="submit" className="min-h-[44px]">
            Save address
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Your role on NexusIoT">
        <div className="flex items-start gap-3 mb-4 p-4 rounded-lg bg-muted/40 border">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{meta.label}</p>
            <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
          </div>
        </div>
        <RoleAccessGrid compact highlight={primary} />
        <p className="text-xs text-muted-foreground mt-4">
          Need vendor or admin access? Contact your platform super admin or use the setup tool
          below.
        </p>
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-amber-500 shrink-0" />
              No super admin yet?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              If your account doesn't have admin access, use the one-time setup page to activate it.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/setup">Activate super admin</Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
