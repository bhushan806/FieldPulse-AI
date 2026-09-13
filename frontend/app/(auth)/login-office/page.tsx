"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login, getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Mail, Lock, Loader2, ArrowLeft, Building2, BarChart3, ShieldCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { FieldPulseLogo } from "@/components/shared/FieldPulseLogo";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

const ROLE_ROUTES: Record<string, string> = {
  project_manager: "/pm/dashboard",
  hq_admin: "/hq/portfolio",
  auditor: "/hq/portfolio",
  platform_admin: "/admin/dashboard",
  site_engineer: "/engineer/home",
};

export default function LoginOfficePage() {
  const router = useRouter();
  const { setAuth, updateUser } = useAuthStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [invitedError, setInvitedError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Prefetch dashboard routes on page mount
  useEffect(() => {
    router.prefetch("/pm/dashboard");
    router.prefetch("/hq/portfolio");
    router.prefetch("/admin/dashboard");
    router.prefetch("/engineer/home");
  }, [router]);

  const {
    register,
    handleSubmit,
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

      if (auth.user_id) {
        updateUser({
          id: auth.user_id,
          name: auth.name || data.email.split("@")[0],
          email: data.email,
          role: auth.role,
          project_ids: auth.project_ids || [],
        });
      }

      getMe()
        .then((me) => {
          if (me) updateUser(me);
        })
        .catch(() => {});

      const dest = ROLE_ROUTES[auth.role] ?? "/hq/portfolio";
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
            <div className="flex items-center justify-center mb-6">
              <FieldPulseLogo size="md" href="/" />
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
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-border hover:border-border-strong focus:border-brand-500 rounded-xl pl-10 pr-11 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-danger text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="office-sign-in"
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
                You&apos;ve been invited but haven&apos;t set your password yet.
              </p>
              <Link
                href="/set-password"
                className="inline-flex items-center gap-2 bg-surface border border-warning/40 hover:bg-warning-bg text-warning text-sm font-bold px-5 py-2 rounded-xl transition-colors shadow-sm"
              >
                Complete Onboarding & Set Password →
              </Link>
            </div>
          )}

          {/* Switch to Engineer Login */}
          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-xs text-text-muted">
              Field Engineer on mobile or site?{" "}
              <Link href="/login-engineer" className="text-brand-600 hover:text-brand-700 font-semibold underline transition-colors">
                Sign in with Phone &amp; OTP →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
