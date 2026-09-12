import { createFileRoute } from "@tanstack/react-router";
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
import { AccountWorkspaceCard } from "@/components/account/AccountWorkspaceCard";
import { PK_PROVINCES } from "@/lib/pakistan-address";
import { toast } from "sonner";
import { Mail, Phone, User, MapPin } from "lucide-react";

export const Route = createFileRoute("/account/")({ component: AccountProfile });

function AccountProfile() {
  const { user, refreshSession } = useAuth();

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
    const name = String(fd.get("name")).trim();
    if (!name) return toast.error("Enter your name");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        phone: String(fd.get("phone")).trim(),
      })
      .eq("id", user!.id);
    if (error) return toast.error(error.message);
    await supabase.auth.updateUser({ data: { full_name: name } });
    await refreshSession();
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
              placeholder="Username"
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone
            </Label>
            <Input
              name="phone"
              defaultValue={data?.phone ?? ""}
              placeholder="+92 3XX XXXXXXX"
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

      <SectionCard title="Account access">
        <AccountWorkspaceCard />
      </SectionCard>
    </div>
  );
}
