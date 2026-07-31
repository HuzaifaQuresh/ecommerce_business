import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Loader2 } from "lucide-react";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onLoggedOut?: () => void;
}

export function LogoutButton({
  className = "",
  variant = "outline",
  size = "default",
  onLoggedOut,
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message || "Failed to sign out");
        setLoading(false);
        return;
      }

      toast.success("Signed out successfully");
      if (onLoggedOut) {
        onLoggedOut();
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || "An error occurred during sign out");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <LogOut className="h-4 w-4 mr-2" />
      )}
      Sign Out
    </Button>
  );
}
