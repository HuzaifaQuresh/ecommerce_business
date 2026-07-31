import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, User, Mail, Shield, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function UserProfile() {
  const { user, loading: authLoading, refreshSession } = useAuth();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }

    setSaving("true");
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) {
        toast.error(error.message || "Failed to update profile");
        setSaving("");
        return;
      }

      toast.success("Profile updated successfully!");
      if (refreshSession) {
        await refreshSession();
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving("");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="w-full max-w-xl mx-auto shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>Not Signed In</CardTitle>
          <CardDescription>Please sign in to view and manage your profile.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button onClick={() => (window.location.href = "/auth")}>Go to Sign In</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Account Profile</CardTitle>
            <CardDescription>Manage your personal details and account settings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-lg border">
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="truncate">
              <p className="text-xs text-muted-foreground">Email Address</p>
              <p className="font-medium truncate">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="font-medium font-mono text-xs truncate max-w-[180px]">{user.id}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={Boolean(saving)}
              />
              <Button type="submit" disabled={Boolean(saving)} className="min-w-[100px]">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
