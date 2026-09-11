import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound, Eye, EyeOff, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearPasswordRecovery } from "@/lib/password-recovery";

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

export function SetNewPasswordForm() {
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
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    clearPasswordRecovery();
    try {
      await supabase.auth.signOut();
    } catch {
      /* password already saved */
    }
    setBusy(false);
    setDone(true);
  };

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
    { label: "Passwords match", ok: !!confirm && password === confirm },
  ];

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-[#0B192C]">Password updated</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sign in with the <strong>new</strong> password you just set.
        </p>
        <Button
          className="mt-6 w-full min-h-[48px] bg-[#FF7A00] hover:bg-[#E56E00] text-white"
          onClick={() => navigate({ to: "/auth", search: { tab: "signin" } })}
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#0052B4]/10 text-[#0052B4] shrink-0">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF7A00]">Verified</p>
          <h1 className="text-xl font-bold text-[#0B192C]">Set a new password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password, then re-enter it to confirm.</p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div>
          <Label htmlFor="new-pw">New password</Label>
          <div className="relative mt-1.5">
            <Input
              id="new-pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 h-12"
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
          <Label htmlFor="confirm-pw">Re-enter password</Label>
          <div className="relative mt-1.5">
            <Input
              id="confirm-pw"
              type={showCf ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pr-10 h-12"
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

        {password ? (
          <ul className="space-y-1.5 rounded-lg bg-slate-50 border p-3">
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
        ) : null}

        <Button
          type="submit"
          disabled={busy || !password || !confirm}
          className="w-full min-h-[48px] bg-[#0B192C] hover:bg-[#0F2C59] text-white"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>

      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-slate-50 rounded-lg p-3">
        <ShieldAlert className="h-4 w-4 shrink-0 text-[#0052B4] mt-0.5" />
        <p>After changing your password, other devices will need to sign in again.</p>
      </div>
    </>
  );
}
