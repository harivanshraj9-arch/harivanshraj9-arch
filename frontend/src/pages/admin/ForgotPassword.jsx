import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft, Zap, ShieldCheck } from "lucide-react";
import { Toaster, toast } from "sonner";
import { adminHttp, formatApiError } from "@/lib/adminApi";
import { useTheme } from "@/lib/theme";

export default function ForgotPassword() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setErr("Enter your email");
    setBusy(true); setErr("");
    try {
      await adminHttp.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e) {
      setErr(formatApiError(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[hsl(var(--primary))]/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-[hsl(var(--energy))]/10 blur-3xl" />
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
            <ShieldCheck className="w-3.5 h-3.5" /> Forgot Password
          </div>
          <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-black tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your account email. We'll generate a secure reset link (valid for 60 minutes) — your admin will share it with you.
          </p>

          {!sent ? (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Email</label>
                <div className="mt-1 relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    data-testid="forgot-email"
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@prathvipowersolutions.com"
                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                </div>
              </div>

              {err && <div className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/30 rounded-lg px-3 py-2">{err}</div>}

              <button
                data-testid="forgot-submit"
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-lg bg-foreground text-background font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? "Sending…" : "Generate Reset Link"}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              <div className="font-bold text-emerald-600">Request received</div>
              <p className="mt-1 text-muted-foreground">
                If the email exists, we've generated a one-time reset link. Your admin can find it in <strong>Admin → Activity Log</strong> and share it with you.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Links expire in 60 minutes for security.
              </p>
            </div>
          )}

          <Link to="/admin/login" className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </Link>
        </div>
      </div>

      <Toaster position="top-right" theme={theme}
        toastOptions={{ style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" } }} />
    </div>
  );
}
