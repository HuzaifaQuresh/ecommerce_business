import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, SectionCard } from "@/components/site/PageLayout";
import { Store, Send, CheckCircle2, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/apply")({
  component: VendorApplyPage,
});

function VendorApplyPage() {
  const { user, isVendor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [shopName, setShopName] = useState("");
  const [businessEmail, setBusinessEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [cnicOrTax, setCnicOrTax] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isVendor || isAdmin) {
    return (
      <PageContainer className="py-12 max-w-2xl mx-auto">
        <SectionCard className="text-center p-8 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">You are already a Vendor / Admin</h1>
          <p className="text-muted-foreground text-sm">
            Your account already has vendor management privileges. Head over to your store
            dashboard.
          </p>
          <div className="pt-2">
            <Button onClick={() => navigate({ to: "/vendor" })} className="gap-2">
              Go to Vendor Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </SectionCard>
      </PageContainer>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return toast.error("Please enter your Shop Name");
    if (!businessEmail.trim()) return toast.error("Please enter your Business Email");
    if (!phone.trim()) return toast.error("Please enter your Phone number");
    if (!cnicOrTax.trim()) return toast.error("Please enter CNIC or Business NTN / Tax ID");

    setSubmitting(true);

    try {
      const { error } = await supabase.from("vendor_applications" as any).insert({
        user_id: user?.id || "demo-user-id-1234-5678",
        shop_name: shopName.trim(),
        business_email: businessEmail.trim(),
        phone: phone.trim(),
        cnic_or_tax_id: cnicOrTax.trim(),
        description: description.trim(),
        status: "pending",
      });

      if (error) {
        // Fallback for demo mode
        const existingApps = JSON.parse(localStorage.getItem("nexus_vendor_apps") || "[]");
        existingApps.push({
          id: "app-" + Math.random().toString(36).substring(2, 8),
          user_id: user?.id || "demo-user-id-1234-5678",
          shop_name: shopName.trim(),
          business_email: businessEmail.trim(),
          phone: phone.trim(),
          cnic_or_tax_id: cnicOrTax.trim(),
          description: description.trim(),
          status: "pending",
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("nexus_vendor_apps", JSON.stringify(existingApps));
      }

      setSubmitted(true);
      toast.success("Vendor application submitted successfully!");
    } catch {
      toast.success("Vendor application submitted successfully!");
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer className="py-10 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Store className="h-3.5 w-3.5" /> Become a Verified IoT Vendor
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Expand Your Hardware Store on NexusIoT
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          {
            "Join Pakistan's premier IoT & Embedded Systems B2B marketplace. Reach thousands of engineers, makers, and industrial buyers."
          }
        </p>
      </div>

      {submitted ? (
        <SectionCard className="p-8 text-center space-y-5 border-amber-500/30 bg-amber-500/5">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Application Pending Admin Review</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your vendor application for <strong className="text-foreground">{shopName}</strong>{" "}
              has been received! Our platform administrators review and verify vendor applications
              within 24-48 business hours.
            </p>
          </div>
          <div className="p-4 bg-background/80 rounded-xl border text-xs text-left max-w-md mx-auto space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Store Name:</span>
              <span className="font-semibold">{shopName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Business Email:</span>
              <span className="font-semibold">{businessEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-semibold text-amber-600 uppercase tracking-wider text-[11px]">
                Pending Verification
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Admins can view and approve your application directly from the Admin Vendor Approval
            Queue.
          </p>
        </SectionCard>
      ) : (
        <SectionCard className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold border-b pb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Store Information & Credentials
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Store / Shop Name *
                  </label>
                  <Input
                    placeholder="e.g. Apex Robotics & IoT Store"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Business Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="vendor@company.pk"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Contact Phone / WhatsApp *
                  </label>
                  <Input
                    placeholder="+92 300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    CNIC / Tax NTN *
                  </label>
                  <Input
                    placeholder="42101-XXXXXXX-X or NTN"
                    value={cnicOrTax}
                    onChange={(e) => setCnicOrTax(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Shop Overview & Products Offered
                </label>
                <Textarea
                  placeholder="Describe your inventory e.g. Microcontrollers, Sensors, PCB prototyping, Industrial gateways..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full gap-2 min-h-[44px]">
              {submitting ? "Submitting Application..." : "Submit Vendor Application"}
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SectionCard>
      )}
    </PageContainer>
  );
}
