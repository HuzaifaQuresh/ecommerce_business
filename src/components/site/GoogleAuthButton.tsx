import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startGoogleSignIn, googleAuthError } from "@/lib/google-auth";
import { cn } from "@/lib/utils";

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  nextPath,
  disabled,
  className,
  hint,
  label,
  onBeforeStart,
}: {
  nextPath?: string;
  disabled?: boolean;
  className?: string;
  hint?: string;
  label?: string;
  onBeforeStart?: () => boolean | Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (onBeforeStart) {
        const allowed = await onBeforeStart();
        if (!allowed) {
          setBusy(false);
          return;
        }
      }
      const { error: nextError } = await startGoogleSignIn(nextPath);
      if (nextError) {
        setError(nextError);
        setBusy(false);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to start Google sign-in";
      setError(googleAuthError(raw));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => void onClick()}
        disabled={disabled || busy}
        className={cn(
          "w-full min-h-[48px] font-medium flex items-center justify-center gap-2 border-[#0052B4] text-[#0052B4] bg-white shadow-xs hover:text-[#0052B4] hover:bg-muted/80",
          className,
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleMark />}
        {busy ? "Redirecting to Google…" : label || "Continue with Google"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive leading-snug" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center">
          {hint || "New and existing customers can use the same Google button."}
        </p>
      )}
    </div>
  );
}
