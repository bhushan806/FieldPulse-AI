"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login, getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Mail, Lock, Loader2, ArrowLeft, Building2, BarChart3, ShieldCheck, Zap, Copy } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

const ROLE_ROUTES: Record<string, string> = {
  project_manager: "/pm/dashboard",
  hq_admin: "/hq/portfolio",
  auditor: "/hq/portfolio",
};

export default function LoginOfficePage() {
  const router = useRouter();
  const { setAuth, updateUser } = useAuthStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [invitedError, setInvitedError] = useState(false);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setInvitedError(false);
    try {
      const auth = await login(data.email, data.password);
      setAuth({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken ?? "",
        role: auth.role,
      });
      try {
        const me = await getMe();
        updateUser(me);
      } catch {
        /* profile fetch optional */
      }
      const dest = ROLE_ROUTES[auth.role] ?? "/";
      router.replace(dest);
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? "";
      if (detail === "invited, complete onboarding first") {
        setInvitedError(true);
      } else {
        addNotification({
          type: "error",
          message: detail || "Login failed. Check your credentials.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyCreds = (email: string, role: string) => {
    setValue('email', email);
    setValue('password', 'Password123!');
    setCopiedRole(role);
    setTimeout(() => setCopiedRole(null), 2000);
    addNotification({ type: 'success', message: 'Credentials applied!' });
  };

  return (
    <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 relative">
      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary mb-8 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="card p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100">
                <Zap className="w-5 h-5 text-brand-600" />
              </div>
              <span className="text-lg font-bold text-text-primary">FieldPulse <span className="text-brand-500">AI</span></span>
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-2">Office Sign In</h1>
            <p className="text-text-secondary text-sm">Project Manager · HQ Admin · Auditor</p>

            {/* Role icons */}
            <div className="flex items-center justify-center gap-3 mt-5">
              {[
                { icon: BarChart3, label: "PM", color: "text-brand-600", bg: "bg-brand-50 border-brand-100" },
                { icon: Building2, label: "HQ", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                { icon: ShieldCheck, label: "Auditor", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              ].map((r) => (
                <div key={r.label} className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border ${r.bg}`}>
                  <r.icon className={`w-5 h-5 ${r.color}`} />
                  <span className={`text-xs font-semibold ${r.color}`}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@fieldpulse.dev"
                  className="w-full bg-transparent border border-border hover:border-border-strong focus:border-brand-500 rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-danger text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-border hover:border-border-strong focus:border-brand-500 rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
              {errors.password && (
                <p className="text-danger text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 text-base shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Invited error */}
          {invitedError && (
            <div className="mt-5 p-4 bg-warning-bg border border-warning/30 rounded-2xl text-center">
              <p className="text-warning text-sm mb-3 font-semibold">
                You've been invited but haven't set your password yet.
              </p>
              <Link
                href="/set-password"
                className="inline-flex items-center gap-2 bg-white border border-warning/40 hover:bg-warning-bg text-warning text-sm font-bold px-5 py-2 rounded-xl transition-colors shadow-sm"
              >
                Complete Onboarding & Set Password →
              </Link>
            </div>
          )}

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-bg-muted border border-border rounded-2xl">
            <p className="text-xs text-text-secondary font-bold mb-3 uppercase tracking-wider flex items-center justify-between">
              <span>Demo Credentials</span>
              <span className="font-normal normal-case text-text-muted">Click to copy</span>
            </p>
            <div className="space-y-2 text-sm">
              {[
                { role: 'PM', email: 'pm@fieldpulse.dev' },
                { role: 'HQ', email: 'hq@fieldpulse.dev' },
                { role: 'Auditor', email: 'auditor@fieldpulse.dev' },
              ].map((c) => (
                <div key={c.role} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-border">
                  <div>
                    <span className="text-text-primary font-semibold inline-block w-14">{c.role}:</span>
                    <span className="text-text-secondary">{c.email}</span>
                  </div>
                  <button 
                    onClick={() => copyCreds(c.email, c.role)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-bg-app hover:bg-border text-text-secondary transition-colors"
                  >
                    {copiedRole === c.role ? <span className="text-success">Copied!</span> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
