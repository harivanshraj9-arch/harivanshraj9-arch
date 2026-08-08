import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, Zap, ShieldCheck } from "lucide-react";
import { Toaster, toast } from "sonner";
import { authApi, formatApiError } from "@/lib/adminApi";
import { useTheme } from "@/lib/theme";

export default function AdminLogin() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !password) { setErr("Enter email and password"); return; }
    setBusy(true);
    try {
      await authApi.login(email.trim().toLowerCase(), password);
      toast.success("Welcome back");
      navigate("/admin", { replace: true });
    } catch (e) {
      const msg = formatApiError(e);
      setErr(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground relative overflow-hidden">
      {/* Decorative background */}
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
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Access
          </div>
          <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-black tracking-tight">Sign in to Admin Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restricted area — authorized personnel only.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Email</label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  data-testid="admin-email"
                  autoFocus
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@prathvipowersolutions.com"
                  className="w-full h-11 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  data-testid="admin-password"
                  autoComplete="current-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-9 pr-10 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
                <button type="button" tabIndex={-1} onClick={() => setShow(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div data-testid="login-error" className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/30 rounded-lg px-3 py-2">
                {err}
              </div>
            )}

            <button
              data-testid="admin-submit"
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-lg bg-foreground text-background font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Signing in…" : "Sign In"}
            </button>

            <div className="flex items-center justify-between pt-1">
              <a
                data-testid="forgot-link"
                href="/admin/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Forgot password?
              </a>
              <span className="text-[10px] text-muted-foreground">Session expires after 12 hours</span>
            </div>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          © 2026 Prathvi Power Solutions · Admin Panel v1.0
        </div>
      </div>

      <Toaster position="top-right" theme={theme}
        toastOptions={{ style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" } }} />
    </div>
  );
}
