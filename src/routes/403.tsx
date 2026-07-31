import { createFileRoute, Link } from "@tanstack/react-router";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { PageContainer, SectionCard } from "@/components/site/PageLayout";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { RoleBadge } from "@/components/dashboard/RoleBadge";

export const Route = createFileRoute("/403")({
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const { primaryRole, user } = useRole();

  return (
    <PageContainer className="py-16 max-w-xl mx-auto">
      <SectionCard className="text-center p-8 space-y-5 border-destructive/20 bg-destructive/5">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">403 — Access Forbidden</h1>
          <p className="text-sm text-muted-foreground">
            You do not have the required role or authorization level to view this protected page.
          </p>
        </div>

        {user && (
          <div className="p-3 bg-background/80 rounded-lg border text-xs inline-flex items-center gap-2">
            <span className="text-muted-foreground">Your Active Role:</span>
            <RoleBadge role={primaryRole} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="outline" asChild className="w-full sm:w-auto gap-2">
            <Link to="/">
              <Home className="h-4 w-4" /> Go to Storefront
            </Link>
          </Button>
          {!user ? (
            <Button asChild className="w-full sm:w-auto gap-2">
              <Link to="/auth">Sign In / Change Account</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" className="w-full sm:w-auto gap-2">
              <Link to="/account">
                <ArrowLeft className="h-4 w-4" /> My Account
              </Link>
            </Button>
          )}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
