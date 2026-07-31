import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DashboardPageHeader, ResponsiveScroll } from "@/components/site/PageLayout";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MOCK_VOUCHERS } from "@/lib/mock-data";
import { fmtPKR } from "@/lib/format";

export const Route = createFileRoute("/admin/vouchers")({ component: AdminVouchers });

const EMPTY_FORM = {
  code: "",
  label: "",
  discount_pct: 10,
  discount_flat_pkr: 0,
  min_order_pkr: 5000,
  max_uses: "",
  expires_at: "",
};
type VoucherForm = typeof EMPTY_FORM;

function AdminVouchers() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(typeof EMPTY_FORM & { id: string }) | null>(null);
  const [form, setForm] = useState<VoucherForm>(EMPTY_FORM);

  const { data } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("vouchers")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data?.length) return data;
      } catch {
        /* demo */
      }
      return MOCK_VOUCHERS;
    },
  });

  const save = async () => {
    if (!form.code.trim()) return toast.error("Code is required");
    const payload = {
      code: form.code.toUpperCase().trim(),
      label: form.label,
      discount_pct: Number(form.discount_pct),
      discount_flat_pkr: Number(form.discount_flat_pkr),
      min_order_pkr: Number(form.min_order_pkr),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };
    const { error } = await supabase.from("vouchers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Voucher created");
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
  };

  const update = async () => {
    if (!editTarget) return;
    const payload = {
      label: form.label,
      discount_pct: Number(form.discount_pct),
      discount_flat_pkr: Number(form.discount_flat_pkr),
      min_order_pkr: Number(form.min_order_pkr),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };
    const { error } = await supabase.from("vouchers").update(payload).eq("id", editTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Voucher updated");
    setEditTarget(null);
    qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("vouchers").update({ is_active: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this voucher?")) return;
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
  };

  const openEdit = (v: (typeof data)[number]) => {
    setEditTarget({ ...EMPTY_FORM, id: v.id });
    setForm({
      code: v.code,
      label: v.label ?? "",
      discount_pct: Number(v.discount_pct),
      discount_flat_pkr: Number(v.discount_flat_pkr),
      min_order_pkr: Number(v.min_order_pkr),
      max_uses: v.max_uses != null ? String(v.max_uses) : "",
      expires_at: v.expires_at ? v.expires_at.slice(0, 10) : "",
    });
  };

  const FormFields = () => (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Code *</Label>
          <Input
            placeholder="NEXUS10"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            disabled={!!editTarget}
          />
        </div>
        <div>
          <Label>Label</Label>
          <Input
            placeholder="Summer sale"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Discount %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={form.discount_pct}
            onChange={(e) => setForm({ ...form, discount_pct: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Flat discount (PKR)</Label>
          <Input
            type="number"
            min="0"
            value={form.discount_flat_pkr}
            onChange={(e) => setForm({ ...form, discount_flat_pkr: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Min order (PKR)</Label>
          <Input
            type="number"
            min="0"
            value={form.min_order_pkr}
            onChange={(e) => setForm({ ...form, min_order_pkr: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Max uses (leave blank = unlimited)</Label>
          <Input
            type="number"
            min="1"
            placeholder="—"
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Expires at (optional)</Label>
        <Input
          type="date"
          value={form.expires_at}
          onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Vouchers"
        description="Create, edit, and deactivate promotional codes."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(EMPTY_FORM)}>
                <Plus className="h-4 w-4 mr-1" /> New voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create voucher</DialogTitle>
              </DialogHeader>
              <FormFields />
              <Button className="w-full mt-2" onClick={save}>
                Create
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <ResponsiveScroll>
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-semibold">Code</th>
              <th className="p-3 font-semibold">Discount</th>
              <th className="p-3 font-semibold">Min order</th>
              <th className="p-3 font-semibold">Uses</th>
              <th className="p-3 font-semibold">Expires</th>
              <th className="p-3 font-semibold">Active</th>
              <th className="p-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((v) => (
              <tr key={v.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="p-3">
                  <span className="font-mono font-semibold">{v.code}</span>
                  {v.label && <div className="text-xs text-muted-foreground">{v.label}</div>}
                </td>
                <td className="p-3">
                  {Number(v.discount_pct) > 0 && <span>{v.discount_pct}%</span>}
                  {Number(v.discount_pct) > 0 && Number(v.discount_flat_pkr) > 0 && (
                    <span className="text-muted-foreground"> + </span>
                  )}
                  {Number(v.discount_flat_pkr) > 0 && (
                    <span>{fmtPKR(Number(v.discount_flat_pkr))}</span>
                  )}
                </td>
                <td className="p-3 tabular-nums">{fmtPKR(Number(v.min_order_pkr))}</td>
                <td className="p-3 tabular-nums">
                  {v.used_count ?? 0}
                  {v.max_uses != null ? ` / ${v.max_uses}` : ""}
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {v.expires_at ? new Date(v.expires_at).toLocaleDateString("en-PK") : "—"}
                </td>
                <td className="p-3">
                  <Switch
                    checked={!!v.is_active}
                    onCheckedChange={() => toggleActive(v.id, !!v.is_active)}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Dialog
                      open={editTarget?.id === v.id}
                      onOpenChange={(o) => {
                        if (!o) setEditTarget(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit voucher — {v.code}</DialogTitle>
                        </DialogHeader>
                        <FormFields />
                        <Button className="w-full mt-2" onClick={update}>
                          Save changes
                        </Button>
                      </DialogContent>
                    </Dialog>
                    <Button size="icon" variant="ghost" onClick={() => del(v.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  No vouchers yet. Create your first promotional code above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveScroll>
    </div>
  );
}
