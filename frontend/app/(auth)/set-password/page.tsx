"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { Lock, CheckCircle2, ArrowLeft, Zap, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";

const ROLE_ROUTES: Record<string, string> = {
  project_manager: "/pm/dashboard",
  hq_admin: "/hq/portfolio",
  auditor: "/hq/portfolio",
};

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const { setAuth, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordStrength = password.length === 0
    ? null
    : password.length < 6
    ? "weak"
    : password.length < 10
    ? "medium"
    : "strong";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/api/auth/set-password", {
        invite_token: token,
        password,
      });

      // Persist auth state — axios wraps response body in .data
      setAuth({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken ?? "",
        role: res.data.role,
      });

      // Fetch user data right after password set
      const { getMe } = await import("@/lib/api/auth");
      const me = await getMe();
      updateUser(me);

      const dest = ROLE_ROUTES[res.data.role] ?? "/";
      router.replace(dest);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ??
        err?.message ??
        "Failed to set password. The invite link may be invalid or expired.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070E1A] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/7 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-8 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="bg-white/4 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                FieldPulse <span className="text-cyan-400">AI</span>
              </span>
            </div>

            <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-violet-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Complete Onboarding</h1>
            <p className="text-slate-400 text-sm">
              Set a secure password for your FieldPulse AI account
            </p>
          </div>

          {/* No token warning */}
          {!token ? (
            <div className="p-5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-center">
              <p className="text-amber-300 text-sm font-semibold mb-1">No invite token found</p>
              <p className="text-amber-400/70 text-xs">
                Please use the invitation link sent to your email. Do not navigate to this page manually.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl">
                  <p className="text-red-300 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-1.5 block">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none transition-colors text-sm"
                  />
                </div>
                {/* Strength bar */}
                {passwordStrength && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          passwordStrength === "weak"
                            ? "w-1/3 bg-red-500"
                            : passwordStrength === "medium"
                            ? "w-2/3 bg-amber-500"
                            : "w-full bg-green-500"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        passwordStrength === "weak"
                          ? "text-red-400"
                          : passwordStrength === "medium"
                          ? "text-amber-400"
                          : "text-green-400"
                      }`}
                    >
                      {passwordStrength}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-1.5 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Re-enter password"
                    className={`w-full bg-white/5 border hover:border-white/20 focus:border-violet-500 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none transition-colors text-sm ${
                      confirm && confirm !== password
                        ? "border-red-500/60"
                        : confirm && confirm === password
                        ? "border-green-500/60"
                        : "border-white/10"
                    }`}
                  />
                  {confirm && confirm === password && (
                    <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                  )}
                </div>
                {confirm && confirm !== password && (
                  <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (!!confirm && confirm !== password)}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:-translate-y-0.5 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Set Password & Sign In
                  </>
                )}
              </button>
            </form>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-white/3 border border-white/8 rounded-2xl">
            <p className="text-xs text-slate-500 leading-relaxed">
              After setting your password, you&apos;ll be automatically signed in and redirected to your
              dashboard. You can use email + password to log in from now on.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070E1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}
