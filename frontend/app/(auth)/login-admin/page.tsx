"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login, getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Mail, Lock, Loader2, ArrowLeft, ShieldAlert, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginAdminPage() {
  const router = useRouter();
  const { setAuth, updateUser } = useAuthStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Prefetch admin dashboard on mount
  useEffect(() => {
    router.prefetch("/admin/dashboard");
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const auth = await login(data.email, data.password);
      if (auth.role !== "platform_admin") {
        throw new Error("Unauthorized. Platform Admin only.");
      }
      setAuth({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken ?? "",
        role: auth.role,
      });

      if (auth.user_id) {
        updateUser({
          id: auth.user_id,
          name: auth.name || "Platform Admin",
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

      router.replace("/admin/dashboard");
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? "";
      addNotification({
        type: "error",
        message: detail || "Admin login failed. Check credentials.",
      });
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
            <div className="w-12 h-12 bg-danger-bg border border-danger/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-danger" />
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-1">Platform Admin</h1>
            <p className="text-text-secondary text-sm">Restricted Access</p>
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
                  placeholder="admin@fieldpulse.dev"
                  className="w-full bg-transparent border border-border hover:border-border-strong focus:border-danger rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-danger/20 transition-all text-sm"
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
                  className="w-full bg-transparent border border-border hover:border-border-strong focus:border-danger rounded-xl pl-10 pr-11 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-danger/20 transition-all text-sm"
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
              className="w-full bg-danger text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 text-base shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" /> Authenticate
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
