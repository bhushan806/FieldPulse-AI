"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestOtp, verifyOtp } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Phone, KeyRound, Loader2, ArrowLeft, HardHat, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const phoneSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number (min 10 digits)"),
});
const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function LoginEngineerPage() {
  const router = useRouter();
  const { setAuth, updateUser } = useAuthStore();
  const { addNotification } = useUIStore();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onRequestOtp = async (data: PhoneForm) => {
    setLoading(true);
    setRosterError("");
    try {
      await requestOtp(data.phone);
      setPhone(data.phone);
      setStep("otp");
      addNotification({ type: "success", message: "OTP sent! Check your phone." });
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? "Failed to send OTP";
      if (detail.toLowerCase().includes("not registered") || detail.toLowerCase().includes("roster")) {
        setRosterError(detail);
      } else {
        addNotification({ type: "error", message: detail });
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (data: OtpForm) => {
    setLoading(true);
    try {
      const auth = await verifyOtp(phone, data.otp);
      setAuth({
        accessToken: auth.access_token,
        refreshToken: auth.refresh_token ?? "",
        role: auth.role,
      });
      if (auth.user) updateUser(auth.user);
      router.replace("/engineer/home");
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? "Invalid or expired OTP.";
      addNotification({ type: "error", message: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 relative">
      <div className="relative z-10 w-full max-w-md">
        {/* Back */}
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
              <span className="text-lg font-bold text-text-primary">
                FieldPulse <span className="text-brand-500">AI</span>
              </span>
            </div>

            <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HardHat className="w-8 h-8 text-orange-500" />
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-1">Field Engineer Login</h1>
            <p className="text-text-secondary text-sm">
              {step === "phone"
                ? "Enter your registered phone number to receive an OTP"
                : `OTP sent to ${phone}`}
            </p>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <div className={`flex items-center gap-2 text-xs font-semibold ${step === "phone" ? "text-brand-600" : "text-success"}`}>
                {step === "otp" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-brand-600 flex items-center justify-center text-[10px]">1</span>
                )}
                Phone Number
              </div>
              <div className="w-8 h-px bg-border-strong" />
              <div className={`flex items-center gap-2 text-xs font-semibold ${step === "otp" ? "text-brand-600" : "text-text-muted"}`}>
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${step === "otp" ? "border-brand-600" : "border-border-strong"}`}>2</span>
                Verify OTP
              </div>
            </div>
          </div>

          {/* Roster error */}
          {rosterError && (
            <div className="mb-5 p-4 bg-danger-bg border border-danger/30 rounded-2xl">
              <p className="text-danger text-sm font-medium text-center">{rosterError}</p>
              <p className="text-danger/70 text-xs text-center mt-1">
                Contact your Project Manager to be added to the project roster.
              </p>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={phoneForm.handleSubmit(onRequestOtp)} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-text-primary mb-1.5 block">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    {...phoneForm.register("phone")}
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full bg-white border border-border hover:border-border-strong focus:border-brand-500 rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                  />
                </div>
                {phoneForm.formState.errors.phone && (
                  <p className="text-danger text-xs mt-1.5">
                    {phoneForm.formState.errors.phone.message}
                  </p>
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
                    <Phone className="w-4 h-4" /> Send OTP
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-text-primary mb-1.5 block">
                  One-Time Password
                </label>
                <input
                  {...otpForm.register("otp")}
                  type="text"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="w-full bg-white border border-border hover:border-border-strong focus:border-brand-500 rounded-xl px-4 py-4 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-center text-3xl tracking-[0.5em] font-mono transition-all"
                />
                <p className="text-xs text-text-secondary mt-2 text-center">You can paste the code directly.</p>
                {otpForm.formState.errors.otp && (
                  <p className="text-danger text-xs mt-1.5 text-center">
                    {otpForm.formState.errors.otp.message}
                  </p>
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
                    <KeyRound className="w-4 h-4" /> Verify & Login
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setRosterError("");
                  otpForm.reset();
                }}
                className="w-full text-brand-600 hover:text-brand-700 text-sm py-2 transition-colors font-medium"
              >
                ← Use a different number
              </button>
            </form>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-bg-muted border border-border rounded-2xl">
            <p className="text-xs text-text-secondary font-bold mb-1.5 uppercase tracking-wider">
              Access is Invitation-Only
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              You must be added to a project roster by your Project Manager before you can log in.
              No self sign-up is allowed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
