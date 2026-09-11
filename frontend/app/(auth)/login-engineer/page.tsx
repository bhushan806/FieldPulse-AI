"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestOtp, verifyOtp, getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Phone, KeyRound, Loader2, ArrowLeft, HardHat, Zap, CheckCircle2, Copy } from "lucide-react";
import Link from "next/link";
import { FieldPulseLogo } from "@/components/shared/FieldPulseLogo";

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
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onRequestOtp = async (data: PhoneForm) => {
    setLoading(true);
    setRosterError("");
    try {
      const res = await requestOtp(data.phone);
      setPhone(data.phone);
      if (res?.otp) {
        setReceivedOtp(res.otp);
      }
      setStep("otp");
      addNotification({ 
        type: "success", 
        message: res?.otp ? `OTP sent! (Dev OTP: ${res.otp})` : "OTP sent! Check your phone." 
      });
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
      router.replace("/engineer/home");
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? "Invalid or expired OTP.";
      addNotification({ type: "error", message: detail });
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = async () => {
    const demoPhone = "+91 98765 43210";
    phoneForm.setValue("phone", demoPhone);
    setLoading(true);
    setRosterError("");
    try {
      const res = await requestOtp(demoPhone);
      setPhone(demoPhone);
      const code = res?.otp || "123456";
      setReceivedOtp(code);
      otpForm.setValue("otp", code);
      setStep("otp");
      addNotification({ 
        type: "success", 
        message: `Demo OTP ready (${code})! Click Verify & Login.` 
      });
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? "Failed to send OTP";
      addNotification({ type: "error", message: detail });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText("+91 98765 43210");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="flex items-center justify-center mb-6">
              <FieldPulseLogo size="md" href="/" />
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
                Contact your Project Manager to be added to the project roster, or use the Demo Engineer below.
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
                
                {/* Quick OTP fill button */}
                <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                  <span className="text-text-secondary">
                    Mock OTP: <span className="font-mono font-bold text-brand-600">{receivedOtp || "123456"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => otpForm.setValue("otp", receivedOtp || "123456")}
                    className="text-brand-600 hover:text-brand-700 font-semibold underline transition-colors"
                  >
                    Fill OTP ({receivedOtp || "123456"})
                  </button>
                </div>

                {otpForm.formState.errors.otp && (
                  <p className="text-danger text-xs mt-1.5 text-center">
                    {otpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="engineer-verify-otp"
                className="w-full btn-primary py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 text-base shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" /> Verify &amp; Login
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

          {/* Demo credentials card (similar to login-office) */}
          <div className="mt-6 p-4 bg-bg-muted border border-border rounded-2xl">
            <p className="text-xs text-text-secondary font-bold mb-3 uppercase tracking-wider flex items-center justify-between">
              <span>Demo Engineer Credentials</span>
              <span className="font-normal normal-case text-text-muted">Instant Access</span>
            </p>
            <div className="p-3 bg-white rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold text-text-primary">Ramesh Kumar</span>
                  <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Site Engineer</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="text-xs text-text-secondary">
                Phone: <span className="font-mono text-text-primary font-medium">+91 98765 43210</span>
                <span className="mx-2 text-border-strong">&bull;</span>
                OTP: <span className="font-mono text-brand-600 font-semibold">123456</span>
              </div>
              {step === "phone" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleUseDemo}
                  data-testid="engineer-demo-login"
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-brand-200"
                >
                  <Zap className="w-3.5 h-3.5" /> Auto-fill Demo Engineer &amp; Send OTP
                </button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-bg-muted/60 border border-border/60 rounded-xl">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Invitation-Only:</strong> Engineers must be registered in an active project&apos;s roster by a Project Manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
