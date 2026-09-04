"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HardHat,
  BarChart3,
  Building2,
  ShieldCheck,
  ArrowRight,
  Zap,
  Camera,
  Cpu,
  Activity,
  Shield,
  Globe,
  CheckCircle2,
  ChevronDown,
  Wifi,
  Layers,
  TrendingUp,
  ClipboardList,
  Users,
  MapPin,
} from "lucide-react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-bg-app text-text-primary overflow-x-hidden font-sans">
      {/* ── Sticky Navbar ────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-text-primary">
              FieldPulse <span className="text-brand-600 font-light">AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-text-secondary hover:text-brand-600 text-sm font-semibold transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-text-secondary hover:text-brand-600 text-sm font-semibold transition-colors">
              How It Works
            </a>
            <a href="#roles" className="text-text-secondary hover:text-brand-600 text-sm font-semibold transition-colors">
              Login
            </a>
          </div>

          <a
            href="#roles"
            className="inline-flex items-center gap-2 btn-primary px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md font-bold text-sm"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-12 overflow-hidden bg-gradient-to-b from-brand-50/50 to-bg-app">
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_80%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.15)_1px,transparent_1px)] bg-[size:96px_96px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_80%,transparent_100%)]" />
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center mt-10">

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1] mb-8 text-text-primary">
            Infrastructure
            <br />
            <span className="text-brand-600">
              Progress Tracking
            </span>
            <br />
            <span className="text-text-secondary text-4xl sm:text-5xl md:text-6xl font-extrabold">
              Powered by AI
            </span>
          </h1>

          <p className="text-text-secondary text-lg md:text-xl font-medium leading-relaxed max-w-3xl mx-auto mb-10">
            FieldPulse AI connects field engineers, project managers, and HQ in one intelligent platform.
            Capture evidence from the field, let AI match it to your schedule, and keep every stakeholder
            informed — <span className="text-text-primary font-bold">in real time.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="#roles"
              className="inline-flex items-center gap-2 btn-primary px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-200 shadow-md hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5" /> Select Your Role & Login
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-text-secondary font-bold hover:text-text-primary border-2 border-border hover:border-border-strong bg-white px-8 py-4 rounded-2xl text-lg transition-all duration-200 shadow-sm hover:-translate-y-0.5"
            >
              Explore Features <ChevronDown className="w-5 h-5" />
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "63", label: "Core Features" },
              { value: "4", label: "User Roles" },
              { value: "AI", label: "Powered Engine" },
              { value: "100%", label: "Evidence-Backed" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-border rounded-2xl p-5 shadow-sm"
              >
                <div className="text-3xl font-black text-brand-600 mb-1">{stat.value}</div>
                <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Pipeline Visual ────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-border bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: Camera, label: "Photo / Video" },
              { icon: Zap, label: "→" },
              { icon: Cpu, label: "AI Analysis" },
              { icon: Zap, label: "→" },
              { icon: Activity, label: "Confidence Score" },
              { icon: Zap, label: "→" },
              { icon: CheckCircle2, label: "Auto Approve" },
              { icon: Zap, label: "/ PM Review" },
              { icon: Zap, label: "→" },
              { icon: TrendingUp, label: "Schedule Update" },
            ].map((step, i) =>
              step.label === "→" || step.label === "/ PM Review" ? (
                <span key={i} className="text-text-muted font-bold text-lg hidden sm:block">
                  {step.label}
                </span>
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5 shadow-sm"
                >
                  <step.icon className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-bold text-brand-700">{step.label}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-bg-app">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-5 shadow-sm">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-wider uppercase">63 Features Across 12 Categories</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-text-primary mb-5">
              Everything You Need,{" "}
              <span className="text-brand-600">
                Nothing Extra
              </span>
            </h2>
            <p className="text-text-secondary text-lg font-medium max-w-2xl mx-auto">
              From field capture to executive reporting — FieldPulse AI is one connected system built for
              infrastructure project management at scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="group relative bg-white border border-border hover:border-brand-300 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer"
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feat.iconBg} border ${feat.iconBorder} transition-all duration-300 shadow-sm group-hover:scale-110`}
                >
                  <feat.icon className={`w-7 h-7 ${feat.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">{feat.title}</h3>
                <p className="text-text-secondary text-sm font-medium leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 relative bg-white border-y border-border">
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_90%_70%_at_50%_50%,#000_80%,transparent_100%)]" />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 mb-5 shadow-sm">
              <Activity className="w-4 h-4 text-brand-600" />
              <span className="text-brand-700 text-xs font-bold tracking-wider uppercase">End-to-End Workflow</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-text-primary mb-5">
              How{" "}
              <span className="text-brand-600">
                FieldPulse AI
              </span>{" "}
              Works
            </h2>
            <p className="text-text-secondary text-lg font-medium max-w-2xl mx-auto">
              A strict, transparent hierarchy ensures every piece of evidence is verifiable and every
              decision is traceable.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(100%_-_1rem)] w-8 z-10">
                    <ArrowRight className="w-6 h-6 text-border-strong" />
                  </div>
                )}
                <div className="bg-bg-app border border-border rounded-2xl p-8 h-full shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${step.iconBg} shadow-sm border ${step.iconBorder}`}>
                    <step.icon className={`w-8 h-8 ${step.iconColor}`} />
                  </div>
                  <div className="text-xs text-text-muted font-bold uppercase tracking-widest mb-3">
                    Step {i + 1}
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-3">{step.title}</h3>
                  <p className="text-text-secondary text-sm font-medium leading-relaxed mb-6">{step.desc}</p>
                  <ul className="space-y-2">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5 text-sm font-semibold text-text-primary">
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* AI Decision Banner */}
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-brand-500" />
            <div className="text-xs text-brand-700 font-bold uppercase tracking-widest mb-4">
              AI Confidence Engine
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-3 bg-white border border-success/20 shadow-sm rounded-xl px-5 py-3 w-full sm:w-auto">
                <CheckCircle2 className="w-6 h-6 text-success" />
                <div className="text-left">
                  <div className="font-bold text-text-primary">High Confidence</div>
                  <div className="text-text-muted text-xs font-semibold">Auto-approve & update schedule</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-border-strong rotate-90 sm:rotate-0" />
              <div className="flex items-center gap-3 bg-white border border-warning/20 shadow-sm rounded-xl px-5 py-3 w-full sm:w-auto">
                <ClipboardList className="w-6 h-6 text-warning" />
                <div className="text-left">
                  <div className="font-bold text-text-primary">Medium Confidence</div>
                  <div className="text-text-muted text-xs font-semibold">PM Review Queue</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-border-strong rotate-90 sm:rotate-0" />
              <div className="flex items-center gap-3 bg-white border border-danger/20 shadow-sm rounded-xl px-5 py-3 w-full sm:w-auto">
                <Camera className="w-6 h-6 text-danger" />
                <div className="text-left">
                  <div className="font-bold text-text-primary">Low Confidence</div>
                  <div className="text-text-muted text-xs font-semibold">Request recapture</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role Login Portal ─────────────────────────────────── */}
      <section id="roles" className="py-24 px-6 bg-bg-app relative">
        {/* Background Grid & Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute top-[10%] left-[-10%] w-[600px] h-[600px] bg-emerald-400/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-400/15 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-5 shadow-sm">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 text-xs font-bold tracking-wider uppercase">4 Roles · Strict Hierarchy</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-text-primary mb-5">
              Select Your Role to{" "}
              <span className="text-brand-600">
                Login or Sign In
              </span>
            </h2>
            <p className="text-text-secondary text-lg font-medium max-w-2xl mx-auto">
              Access is strictly controlled. You must be assigned to a project before you can log in.
              Choose your role below to proceed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {ROLES.map((r) => (
              <Link
                key={r.title}
                href={r.href}
                className={`
                  group flex flex-col p-8 rounded-2xl cursor-pointer
                  bg-white border border-border shadow-sm
                  hover:border-${r.borderColor} hover:shadow-lg
                  transition-all duration-300 hover:-translate-y-1
                  relative overflow-hidden
                `}
              >
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${r.topGradient}`} />

                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${r.iconBg} border ${r.iconBorder} transition-all duration-300 group-hover:scale-110 shadow-sm`}
                >
                  <r.icon className={`w-8 h-8 ${r.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className={`inline-block px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-widest mb-4 ${r.badgeBg} ${r.badgeColor} ${r.badgeBorder}`}>
                    {r.badge}
                  </div>
                  <h3 className="text-2xl font-black text-text-primary mb-3">{r.title}</h3>
                  <p className="text-text-secondary text-sm font-medium leading-relaxed mb-6">{r.desc}</p>

                  <ul className="space-y-2 mb-8 bg-bg-app p-4 rounded-xl border border-border">
                    {r.perms.map((p) => (
                      <li key={p} className="flex items-center gap-2.5 text-xs font-semibold text-text-primary">
                        <div className={`w-1.5 h-1.5 rounded-full ${r.dotColor} flex-shrink-0`} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className={`flex items-center justify-between pt-5 border-t border-border mt-auto`}>
                  <span className={`text-sm font-bold ${r.ctaColor}`}>
                    {r.href === "/login-engineer" ? "Login with OTP" : "Login with Email"}
                  </span>
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.iconBg} ${r.iconColor} border ${r.iconBorder} group-hover:translate-x-1 transition-transform duration-300 shadow-sm`}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom notice */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-white border border-border rounded-xl px-6 py-4 shadow-sm">
              <Shield className="w-5 h-5 text-text-muted" />
              <p className="text-text-secondary text-sm font-medium">
                <span className="text-text-primary font-bold">Access is invitation-only.</span> Engineers are added by
                Project Managers. PMs are invited by HQ Admin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust / Compliance Section ────────────────────────── */}
      <section className="py-16 px-6 border-y border-border bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, label: "End-to-End Encrypted", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
              { icon: Wifi, label: "Offline-First PWA", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
              { icon: Globe, label: "Multilingual AI", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
              { icon: MapPin, label: "GPS-Tagged Evidence", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-xl ${item.bg} border ${item.border} shadow-sm flex items-center justify-center`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <p className="text-sm font-bold text-text-primary">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-8 px-6 bg-bg-app">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black text-text-primary">
              FieldPulse <span className="text-brand-600">AI</span>
            </span>
          </div>
          <p className="text-xs font-semibold text-text-muted text-center">
            SIH 2026 · Problem Statement SIH26122 · Oil India Limited · Infrastructure Progress Tracking
          </p>
          <p className="text-xs font-bold text-text-muted">Built for Field. Powered by AI.</p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Static Data ─────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Camera,
    title: "AI-Powered Field Capture",
    desc: "Geo-tagged photos, short videos, voice notes, and QR scans. Evidence captured once, linked to schedule automatically.",
    iconBg: "bg-orange-50",
    iconBorder: "border-orange-200",
    iconColor: "text-orange-600",
  },
  {
    icon: Cpu,
    title: "Multi-Signal AI Engine",
    desc: "CLIP computer vision + Whisper speech-to-text + Mistral NLP + GPS proximity fused into one explainable confidence score.",
    iconBg: "bg-brand-50",
    iconBorder: "border-brand-200",
    iconColor: "text-brand-600",
  },
  {
    icon: Activity,
    title: "Real-Time Schedule Sync",
    desc: "High-confidence submissions auto-update the WBS schedule. WebSocket dashboards reflect changes instantly.",
    iconBg: "bg-success-bg",
    iconBorder: "border-success/20",
    iconColor: "text-success",
  },
  {
    icon: TrendingUp,
    title: "Predictive Delay Intelligence",
    desc: "ML-based completion forecasting, early-warning delay detection, and critical-path slippage warnings before they become problems.",
    iconBg: "bg-purple-50",
    iconBorder: "border-purple-200",
    iconColor: "text-purple-600",
  },
  {
    icon: Shield,
    title: "Immutable Audit Trail",
    desc: "Every progress claim traces back to its original evidence — who captured it, who approved it, when it happened.",
    iconBg: "bg-blue-50",
    iconBorder: "border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    icon: Wifi,
    title: "Offline-First PWA",
    desc: "Engineers capture evidence without connectivity. Queued submissions auto-sync the moment the network returns.",
    iconBg: "bg-emerald-50",
    iconBorder: "border-emerald-200",
    iconColor: "text-emerald-600",
  },
];

const WORKFLOW_STEPS = [
  {
    icon: Building2,
    iconBg: "bg-purple-50",
    iconBorder: "border-purple-200",
    iconColor: "text-purple-600",
    title: "HQ Sets Up the Project",
    desc: "HQ Admin creates the project, uploads the WBS schedule, and invites the Project Manager.",
    bullets: [
      "Create project with location & dates",
      "Bulk import schedule activities",
      "Invite Project Manager by email",
    ],
  },
  {
    icon: Users,
    iconBg: "bg-brand-50",
    iconBorder: "border-brand-200",
    iconColor: "text-brand-600",
    title: "PM Manages the Roster",
    desc: "The PM sets their password, adds site engineers to the roster, and monitors the review queue.",
    bullets: [
      "Accept invite & set password",
      "Add engineers by phone number",
      "Review AI-flagged submissions",
    ],
  },
  {
    icon: HardHat,
    iconBg: "bg-orange-50",
    iconBorder: "border-orange-200",
    iconColor: "text-orange-600",
    title: "Engineer Captures Evidence",
    desc: "Rostered engineers log in via OTP, see nearby activities, and submit photo/voice/QR evidence.",
    bullets: [
      "GPS-matched nearby activities",
      "Photo + voice + QR capture",
      "Instant AI-powered feedback",
    ],
  },
];

const ROLES = [
  {
    icon: HardHat,
    title: "Field Engineer",
    badge: "On-Site",
    desc: "Capture site progress via photo, voice note, or QR code directly from the field. Mobile-first, offline-ready.",
    href: "/login-engineer",
    perms: ["GPS-tagged photo/video capture", "Voice notes (multilingual)", "Nearby activity detection", "My submissions history"],
    iconBg: "bg-orange-50",
    iconBorder: "border-orange-200",
    iconColor: "text-orange-600",
    dotColor: "bg-orange-500",
    badgeBg: "bg-orange-50",
    badgeBorder: "border-orange-200",
    badgeColor: "text-orange-700",
    ctaColor: "text-orange-600",
    borderColor: "orange-500",
    topGradient: "bg-orange-500",
  },
  {
    icon: BarChart3,
    title: "Project Manager",
    badge: "Office",
    desc: "Review AI submissions, manage your project schedule, approve or reject field evidence, and generate DPR/WPR reports.",
    href: "/login-office",
    perms: ["AI review queue", "Approve / Reject submissions", "Roster management", "Planned vs Actual dashboard"],
    iconBg: "bg-brand-50",
    iconBorder: "border-brand-200",
    iconColor: "text-brand-600",
    dotColor: "bg-brand-500",
    badgeBg: "bg-brand-50",
    badgeBorder: "border-brand-200",
    badgeColor: "text-brand-700",
    ctaColor: "text-brand-600",
    borderColor: "brand-500",
    topGradient: "bg-brand-500",
  },
  {
    icon: Building2,
    title: "HQ Admin",
    badge: "Portfolio Control",
    desc: "Access the portfolio-wide control tower. Create projects, invite PMs, monitor all active projects from one dashboard.",
    href: "/login-office",
    perms: ["Create & manage projects", "Invite Project Managers", "Portfolio health overview", "Cross-project alerts"],
    iconBg: "bg-purple-50",
    iconBorder: "border-purple-200",
    iconColor: "text-purple-600",
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-50",
    badgeBorder: "border-purple-200",
    badgeColor: "text-purple-700",
    ctaColor: "text-purple-600",
    borderColor: "purple-500",
    topGradient: "bg-purple-500",
  },
  {
    icon: ShieldCheck,
    title: "Auditor",
    badge: "Read-Only",
    desc: "Independent compliance oversight. View all evidence, audit trails, and project data — but cannot modify anything.",
    href: "/login-office",
    perms: ["Read-only access to all data", "Evidence & audit trail", "Portfolio & project dashboards", "Compliance & dispute resolution"],
    iconBg: "bg-emerald-50",
    iconBorder: "border-emerald-200",
    iconColor: "text-emerald-600",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    badgeColor: "text-emerald-700",
    ctaColor: "text-emerald-600",
    borderColor: "emerald-500",
    topGradient: "bg-emerald-500",
  },
];
