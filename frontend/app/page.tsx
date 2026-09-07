"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

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
    <div className="min-h-screen bg-background text-text-primary overflow-x-hidden font-sans selection:bg-brand-500/30">
      {/* ── Sticky Navbar ────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-surface/80 backdrop-blur-xl border-b border-border shadow-sm py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
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
            className="btn-primary"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-12 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 dark:bg-brand-500/20 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-5xl mx-auto text-center mt-10"
        >
          {/* Main Heading */}
          <motion.h1 variants={fadeIn} className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8 text-text-primary">
            Infrastructure
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-secondary-600">
              Progress Tracking
            </span>
            <br />
            <span className="text-text-secondary text-4xl sm:text-5xl md:text-6xl font-extrabold">
              Powered by AI
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-text-secondary text-lg md:text-xl font-medium leading-relaxed max-w-3xl mx-auto mb-10">
            FieldPulse AI connects field engineers, project managers, and HQ in one intelligent platform.
            Capture evidence from the field, let AI match it to your schedule, and keep every stakeholder
            informed — <span className="text-text-primary font-bold">in real time.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="#roles" className="btn-primary text-lg px-8 py-4 shadow-lg shadow-brand-500/25">
              <Zap className="w-5 h-5" /> Select Your Role & Login
            </a>
            <a href="#features" className="btn-outline text-lg px-8 py-4">
              Explore Features <ChevronDown className="w-5 h-5" />
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { value: "63", label: "Core Features" },
              { value: "4", label: "User Roles" },
              { value: "AI", label: "Powered Engine" },
              { value: "100%", label: "Evidence-Backed" },
            ].map((stat) => (
              <motion.div
                variants={fadeIn}
                key={stat.label}
                className="card p-6"
              >
                <div className="text-4xl font-black text-brand-600 mb-2 tabular-nums">{stat.value}</div>
                <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features Section ─────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-surface border-y border-border relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-full px-4 py-1.5 mb-5 shadow-sm">
              <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="text-brand-700 dark:text-brand-400 text-xs font-bold tracking-wider uppercase">63 Features Across 12 Categories</span>
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
              <motion.div
                whileHover={{ y: -5 }}
                key={feat.title}
                className="card-hover card p-8 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400 transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white">
                  <feat.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">{feat.title}</h3>
                <p className="text-text-secondary text-sm font-medium leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role Login Portal ─────────────────────────────────── */}
      <section id="roles" className="py-24 px-6 bg-background relative overflow-hidden">
        <div className="absolute top-[10%] left-[-10%] w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[100px]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-text-primary mb-5">
              Select Your Role to{" "}
              <span className="text-brand-600">
                Login
              </span>
            </h2>
            <p className="text-text-secondary text-lg font-medium max-w-2xl mx-auto">
              Access is strictly controlled based on hierarchical roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {ROLES.map((r) => (
              <Link
                key={r.title}
                href={r.href}
                className="group flex flex-col p-8 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />

                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-neutral-100 dark:bg-neutral-800 text-text-primary transition-all duration-300 group-hover:scale-110">
                  <r.icon className="w-8 h-8" />
                </div>

                <div className="flex-1">
                  <div className="inline-block px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-text-secondary text-xs font-bold uppercase tracking-widest mb-4">
                    {r.badge}
                  </div>
                  <h3 className="text-2xl font-black text-text-primary mb-3">{r.title}</h3>
                  <p className="text-text-secondary text-sm font-medium leading-relaxed mb-6">{r.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-border mt-auto">
                  <span className="text-sm font-bold text-brand-600">
                    {r.href === "/login-engineer" ? "Login with OTP" : "Login with Email"}
                  </span>
                  <ArrowRight className="w-5 h-5 text-brand-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-8 px-6 bg-surface border-t border-border">
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
            SIH 2026 · Problem Statement SIH26122 · Oil India Limited
          </p>
          <p className="text-xs font-bold text-text-muted">Built for Field. Powered by AI.</p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Camera, title: "AI-Powered Field Capture", desc: "Geo-tagged photos, short videos, voice notes, and QR scans. Evidence captured once, linked to schedule automatically." },
  { icon: Cpu, title: "Multi-Signal AI Engine", desc: "CLIP computer vision + Whisper speech-to-text + Mistral NLP + GPS proximity fused into one explainable confidence score." },
  { icon: Activity, title: "Real-Time Schedule Sync", desc: "High-confidence submissions auto-update the WBS schedule. WebSocket dashboards reflect changes instantly." },
  { icon: TrendingUp, title: "Predictive Delay Intelligence", desc: "ML-based completion forecasting, early-warning delay detection, and critical-path slippage warnings before they become problems." },
  { icon: Shield, title: "Immutable Audit Trail", desc: "Every progress claim traces back to its original evidence — who captured it, who approved it, when it happened." },
  { icon: Wifi, title: "Offline-First PWA", desc: "Engineers capture evidence without connectivity. Queued submissions auto-sync the moment the network returns." },
];

const ROLES = [
  { icon: HardHat, title: "Field Engineer", badge: "On-Site", desc: "Capture site progress via photo, voice note, or QR code directly from the field. Mobile-first, offline-ready.", href: "/login-engineer" },
  { icon: BarChart3, title: "Project Manager", badge: "Office", desc: "Review AI submissions, manage your project schedule, approve or reject field evidence, and generate reports.", href: "/login-office" },
  { icon: Building2, title: "HQ Admin", badge: "Portfolio Control", desc: "Access the portfolio-wide control tower. Create projects, invite PMs, monitor all active projects.", href: "/login-office" },
  { icon: ShieldCheck, title: "Auditor", badge: "Read-Only", desc: "Independent compliance oversight. View all evidence, audit trails, and project data — but cannot modify anything.", href: "/login-office" },
];
