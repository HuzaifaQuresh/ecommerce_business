import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, KeyRound, Eye, EyeOff, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Set New Password — NexusIoT" }] }),
  component: ResetPassword,
});

function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : "bg-muted"}`}
          />
        ))}
      </div>
      <p
        className={`text-xs font-medium ${score <= 1 ? "text-red-600" : score === 2 ? "text-amber-600" : "text-emerald-600"}`}
      >
        {labels[score - 1] ?? ""}
      </p>
    </div>
  );
}

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) return toast.error(error.message);
    setDone(true);
  };

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
    { label: "Passwords match", ok: !!confirm && password === confirm },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Cpu className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">NexusIoT</span>
        </div>

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500 mb-4" />
              <h1 className="text-2xl font-bold">Password updated</h1>
              <p className="text-muted-foreground mt-2">
                Your password has been changed successfully. You can now sign in.
              </p>
              <Button
                className="mt-6 w-full min-h-[48px]"
                onClick={() => navigate({ to: "/auth" })}
              >
                Sign In
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Set new password</h1>
                  <p className="text-sm text-muted-foreground">
                    Choose a strong password for your account.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-pw">New password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="new-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <StrengthBar password={password} />
                </div>

                <div>
                  <Label htmlFor="confirm-pw">Confirm password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirm-pw"
                      type={showCf ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCf(!showCf)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password rules checklist */}
                {password && (
                  <ul className="space-y-1.5 rounded-lg bg-muted/40 border p-3">
                    {rules.map((r) => (
                      <li
                        key={r.label}
                        className={`flex items-center gap-2 text-xs ${r.ok ? "text-emerald-600" : "text-muted-foreground"}`}
                      >
                        <span
                          className={`h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${r.ok ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                        >
                          {r.ok ? "✓" : ""}
                        </span>
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  onClick={save}
                  disabled={busy || !password || !confirm}
                  className="w-full min-h-[48px]"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </div>

              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <ShieldAlert className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  After changing your password, all other active sessions will be signed out for
                  security.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
