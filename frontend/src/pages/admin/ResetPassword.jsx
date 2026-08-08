import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, Zap, KeyRound, CheckCircle2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { adminHttp, formatApiError } from "@/lib/adminApi";
import { useTheme } from "@/lib/theme";

export default function ResetPassword() {
  const { theme } = useTheme();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return setErr("Reset link is missing a token");
    if (pw.length < 6) return setErr("Password must be at least 6 characters");
    if (pw !== pw2) return setErr("Passwords do not match");
    setBusy(true); setErr("");
    try {
      await adminHttp.post("/auth/reset-password-with-token", { token, new_password: pw });
      setDone(true);
      toast.success("Password updated");
      setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
    } catch (e) { setErr(formatApiError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[hsl(var(--primary))]/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg bg-foreground text-background flex items-center justify-center">
            <Zap className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.24em] font-bold text-muted-foreground uppercase">Enterprise Suite</div>
            <div className="font-heading text-lg font-black leading-tight">Prathvi Power Solutions</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
            <KeyRound className="w-3.5 h-3.5" /> Reset Password
          </div>
          <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-black tracking-tight">Choose a new password</h1>

          {done ? (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold text-emerald-600">Password updated</div>
                <p className="text-muted-foreground">Redirecting to sign in…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">New Password</label>
                <div className="mt-1 relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    data-testid="reset-new"
                    autoFocus
                    type={show ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-11 pl-9 pr-10 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShow(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Confirm Password</label>
                <div className="mt-1 relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    data-testid="reset-confirm"
                    type={show ? "text" : "password"}
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                </div>
              </div>

              {err && <div className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/30 rounded-lg px-3 py-2">{err}</div>}

              <button
                data-testid="reset-submit"
                type="submit"
                disabled={busy || !token}
                className="w-full h-11 rounded-lg bg-foreground text-background font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
              <Link to="/admin/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">Back to sign in</Link>
            </form>
          )}
        </div>
      </div>

      <Toaster position="top-right" theme={theme}
        toastOptions={{ style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" } }} />
    </div>
  );
}
