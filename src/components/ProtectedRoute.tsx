import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

export function ProtectedRoute({ children, fallbackUrl = "/auth" }: ProtectedRouteProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    if (typeof window !== "undefined") {
      window.location.href = fallbackUrl;
    }
    return null;
  }

  return <>{children}</>;
}
