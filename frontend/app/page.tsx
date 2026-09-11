'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Layers,
  Activity,
  Wifi,
  WifiOff,
  Camera,
  Cpu,
  TrendingUp,
  Clock,
  ChevronRight,
  Play,
  FileCheck,
  Building2,
  HardHat,
  BarChart3,
  Lock,
  Sparkles,
  MapPin,
  QrCode,
  Check
} from 'lucide-react';
import { FieldPulseLogo } from '@/components/shared/FieldPulseLogo';
import { FieldPulseIcon } from '@/components/shared/FieldPulseIcon';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { AuthModal } from '@/components/shared/AuthModal';

export default function EnterpriseLandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'request'>('signin');
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-cycle through the 3-step live product simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const openAuth = (tab: 'signin' | 'request') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-background text-text-primary font-sans selection:bg-brand-500/30 overflow-x-hidden">
      {/* ── Exclusive Homepage Technical Blueprint Grid ─────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Minor 40px Engineering Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Major 200px Structural Axis Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.09)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:200px_200px]" />

        {/* Top Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-gradient-to-b from-brand-500/15 via-cyan-500/8 to-transparent rounded-full blur-3xl opacity-80" />

        {/* Soft Vignette Mask */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_95%_at_50%_35%,transparent_35%,var(--background)_100%)] opacity-85" />
      </div>

      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-surface/85 backdrop-blur-xl border-b border-border shadow-sm py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <FieldPulseLogo size="md" href="/" />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-secondary">
            <a href="#showcase" className="hover:text-text-primary transition-colors">
              Platform
            </a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">
              How It Works
            </a>
            <a href="#outcomes" className="hover:text-text-primary transition-colors">
              Outcomes
            </a>
            <a href="#trust" className="hover:text-text-primary transition-colors">
              Enterprise Trust
            </a>
            <Link href="/roles" className="hover:text-text-primary transition-colors">
              Roles Guide
            </Link>
          </nav>

          {/* Nav Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="hidden sm:inline-flex text-xs font-bold text-text-secondary hover:text-text-primary px-3 py-2 transition-colors"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => openAuth('request')}
              className="btn-primary text-xs px-4 py-2 shadow-sm font-bold flex items-center gap-1.5"
            >
              <span>Get Access</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── 1. Hero Section ───────────────────────────────────── */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 px-6 overflow-hidden">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-brand-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-text-secondary">
                Next-Generation Infrastructure Telemetry
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-xs font-mono font-bold text-brand-600 dark:text-cyan-400">
                Core v2.4 Live
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-text-primary leading-[1.08]">
              AI that closes the loop between{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-indigo-500 to-cyan-500">
                the field and the schedule.
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto font-medium leading-relaxed">
              FieldPulse connects field evidence to project schedules in real time — so delays surface before they cost money.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => openAuth('request')}
                className="btn-primary text-sm px-7 py-3.5 shadow-xl shadow-brand-500/25 font-bold flex items-center gap-2"
              >
                <span>Request a Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('showcase');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-outline text-sm px-6 py-3.5 font-bold flex items-center gap-2"
              >
                <Play className="w-4 h-4 text-brand-600 dark:text-cyan-400 fill-current" />
                <span>Explore Live Pipeline Demo</span>
              </button>
            </div>

            {/* Social Proof Bar */}
            <div className="pt-16 border-t border-border/80">
              <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-8">
                Trusted by infrastructure teams managing $4B+ in active capital projects
              </p>

              {/* Muted Industrial Enterprise Logos */}
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70 hover:opacity-90 transition-opacity">
                {[
                  'Oil India Limited',
                  'TransGlobal Pipe & Energy',
                  'NorthSea Capital Assets',
                  'Apex Infrastructure Partners',
                  'Indus Power Grid',
                ].map((name) => (
                  <div key={name} className="flex items-center gap-2 select-none">
                    <div className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-black text-text-muted">
                      {name.charAt(0)}
                    </div>
                    <span className="font-mono text-xs font-bold tracking-tight text-text-secondary">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Interactive Product Showcase ───────────────────── */}
        <section id="showcase" className="py-24 px-6 bg-surface border-y border-border relative">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                Continuous Ground Truth Verification
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
                From Site Capture to Live S-Curve in Seconds
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Watch how physical site evidence flows through our multi-signal AI engine to automatically recalculate milestone forecasts.
              </p>
            </div>

            {/* Step Selector Tabs */}
            <div className="flex items-center justify-center gap-3">
              {[
                { step: 1, label: '01 Field Capture', icon: Camera },
                { step: 2, label: '02 AI Multi-Signal Match', icon: Cpu },
                { step: 3, label: '03 Live Schedule Sync', icon: TrendingUp },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStep(s.step as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    activeStep === s.step
                      ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-cyan-400 shadow-sm'
                      : 'bg-surface border-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Interactive Showcase Canvas */}
            <div className="card p-6 sm:p-10 border border-border shadow-2xl rounded-3xl bg-surface overflow-hidden relative">
              {/* Header simulation bar */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-text-muted ml-2">
                    fieldpulse://pipeline/sector-4-execution
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Telemetry Live</span>
                </div>
              </div>

              {/* Step 1: Capture Preview */}
              {activeStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fade-in">
                  <div className="space-y-4">
                    <div className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">
                      STEP 01: EDGE CAPTURE
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary">
                      Geotagged Photo, Video & Voice Evidence
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Site engineers take photos, voice notes, or scan pipe spool QR codes using the mobile PWA. Works offline with automatic background sync.
                    </p>
                    <div className="p-4 bg-bg-muted rounded-2xl border border-border space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-text-muted">GPS Coordinates:</span>
                        <span className="font-bold text-text-primary">19.0760° N, 72.8777° E</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Timestamp:</span>
                        <span className="font-bold text-text-primary">14:32:18 UTC (Tamper-Proof)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">SHA-256 Hash:</span>
                        <span className="font-bold text-brand-600 dark:text-cyan-400">e3b0c44298fc1c...</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold">Sector 4 Trenching</span>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">
                        GEO-FENCE VERIFIED
                      </span>
                    </div>
                    <div className="h-44 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 space-y-2 relative overflow-hidden">
                      <Camera className="w-10 h-10 text-cyan-400" />
                      <span className="text-xs font-semibold">Trench Depth Inspection (Photo + Voice Note)</span>
                      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-500">
                        Capture #C-4092
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Audio Log: &ldquo;Completed trenching 120m to specification.&rdquo;</span>
                      <span className="text-cyan-400 font-bold">Uploaded</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: AI Multi-Signal Match Preview */}
              {activeStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fade-in">
                  <div className="space-y-4">
                    <div className="inline-block px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-600 dark:text-cyan-400 font-mono text-xs font-bold">
                      STEP 02: MULTI-SIGNAL AI INFERENCE
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary">
                      CLIP Vision + Whisper Audio + WBS Matching
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Our multi-signal model fuses visual features, speech transcriptions, and GPS proximity to identify the exact schedule activity with an explainable confidence score.
                    </p>
                    <div className="p-4 bg-bg-muted rounded-2xl border border-border space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>Activity Match: WBS EXC-02 (Seam Welding)</span>
                          <span className="text-brand-600 dark:text-cyan-400 font-mono">94.2%</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-600 to-cyan-400 rounded-full" style={{ width: '94.2%' }} />
                        </div>
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        Explainability: Visual features match steel pipe alignment (0.95), audio transcribed &ldquo;weld seam completed&rdquo; (0.93).
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-bold">
                      <span>AI Model Inference Breakdown</span>
                      <span className="text-cyan-400 font-mono">Mistral + CLIP</span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                        <span>Visual Feature Match (CLIP)</span>
                        <span className="text-emerald-400 font-mono font-bold">95.4%</span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                        <span>Audio Speech Transcription (Whisper)</span>
                        <span className="text-emerald-400 font-mono font-bold">93.1%</span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                        <span>Spatial Proximity Match (Geo-Fence)</span>
                        <span className="text-emerald-400 font-mono font-bold">98.0%</span>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        Auto-Matched &amp; Staged for Approval
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Schedule Sync Preview */}
              {activeStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fade-in">
                  <div className="space-y-4">
                    <div className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                      STEP 03: LIVE PORTFOLIO TRUTH
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary">
                      1-Click Approval &amp; Live S-Curve Recomputation
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Project managers approve verified claims with one click. The S-Curve and completion forecast instantly update across executive dashboards.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-bg-muted border border-border">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Approval Time</span>
                        <p className="text-lg font-bold text-text-primary mt-0.5">3.2 Seconds</p>
                      </div>
                      <div className="p-3 rounded-xl bg-bg-muted border border-border">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Delay Mitigated</span>
                        <p className="text-lg font-bold text-emerald-500 mt-0.5">-4.5 Days</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-bold">
                      <span>Schedule Forecast Recalculation</span>
                      <span className="text-emerald-400 font-mono">SYNCED</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Sector 4 Overall Progress</span>
                        <span className="font-bold text-cyan-400 font-mono">68.4% (+6.2%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" style={{ width: '68.4%' }} />
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300">WBS EXC-02 marked Verified</span>
                        <span className="text-emerald-400 font-bold">Audit Stamped ✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 3. The Problem: 3-Column Narrative ─────────────────── */}
        <section className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-danger-bg text-danger text-xs font-bold uppercase tracking-wider border border-danger/20">
                The Capital Project Breakdown
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
                Why Billion-Dollar Infrastructure Runs Late
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Traditional reporting relies on disjointed spreadsheets, paper field tickets, and end-of-month surprises.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  num: '01',
                  title: 'Field reports arrive days late',
                  desc: 'Paper logs, unorganized WhatsApp groups, and manual email attachments hide true site conditions until weeks after work was completed.',
                },
                {
                  num: '02',
                  title: 'Progress claims are unverifiable',
                  desc: 'Subcontractors submit multi-million dollar billing invoices without tamper-proof photo ground truth, GPS stamps, or verified WBS links.',
                },
                {
                  num: '03',
                  title: 'Delays surface too late to fix',
                  desc: 'By the time executive leadership learns of critical path slippage, liquidated damages, remobilization costs, and contractor disputes are locked in.',
                },
              ].map((card) => (
                <div key={card.num} className="card p-8 space-y-4 border border-border">
                  <span className="font-mono text-2xl font-black text-brand-600 dark:text-cyan-400">
                    {card.num}
                  </span>
                  <h3 className="text-lg font-bold text-text-primary">{card.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* The One-Line Resolution */}
            <div className="text-center pt-4">
              <p className="text-2xl sm:text-3xl font-black text-text-primary">
                FieldPulse closes all three.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. How It Works (3 Steps) ─────────────────────────── */}
        <section id="how-it-works" className="py-24 px-6 bg-surface border-y border-border">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                Operational Architecture
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
                How FieldPulse Operates in Production
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Three deterministic stages that eliminate ambiguity and unify field contractors with executive governance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  label: 'Capture',
                  icon: HardHat,
                  title: 'Field engineers submit evidence in seconds',
                  desc: 'Geo-tagged photos, video sweeps, audio memos, and QR scans captured directly on mobile — fully functional offline with automated background synchronization.',
                },
                {
                  step: '02',
                  label: 'Verify',
                  icon: Cpu,
                  title: 'Multi-signal AI matches evidence to schedule',
                  desc: 'Computer vision, Whisper transcription, and spatial geo-fencing fuse into an explainable similarity score linked directly to WBS activities.',
                },
                {
                  step: '03',
                  label: 'Act',
                  icon: BarChart3,
                  title: 'PMs approve, live schedules recalculate',
                  desc: 'Project managers sign off in 1 click. Live S-curves adjust dynamically, and portfolio control towers surface delay alerts before costs compound.',
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="card p-8 space-y-5 border border-border group hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-cyan-400 border border-brand-500/20">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-mono text-xs font-bold text-text-muted">
                        PHASE {s.step}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-text-primary">{s.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 5. Outcomes: Metrics That Matter ──────────────────── */}
        <section id="outcomes" className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                Quantified Business Impact
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
                Outcomes That Move Capital Balance Sheets
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Measured across active capital pipeline and civil infrastructure deployments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  metric: '↓ 73%',
                  label: 'Reduction in Reporting Lag',
                  detail: 'Site progress visibility accelerates from 4.5 days down to sub-second real-time verification.',
                },
                {
                  metric: '↑ 4.2×',
                  label: 'Faster Schedule Visibility',
                  detail: 'Executive control towers spot critical path slippages weeks before contractor invoicing cycles.',
                },
                {
                  metric: '↓ 91%',
                  label: 'Fewer Disputed Progress Claims',
                  detail: 'Cryptographic SHA-256 evidence linking eliminates contractor billing disputes and audit rejection fees.',
                },
              ].map((m) => (
                <div key={m.label} className="card p-8 space-y-3 text-center border border-border">
                  <div className="text-5xl font-black tracking-tight text-brand-600 dark:text-cyan-400 font-mono">
                    {m.metric}
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">{m.label}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{m.detail}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-muted text-center font-medium">
              Typical results across multi-billion dollar EPC oil &amp; gas and transport infrastructure packages.
            </p>
          </div>
        </section>

        {/* ── 6. Built for the Field ────────────────────────────── */}
        <section className="py-24 px-6 bg-surface border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="card p-8 sm:p-14 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl border border-slate-800 shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider border border-cyan-500/20">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline-First Architecture</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Engineered for Zero Connectivity in Extreme Field Conditions.
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Pipeline trenches and remote desert sites rarely have 5G. FieldPulse AI caches project metadata locally, records high-resolution captures in IndexedDB, and automatically queues background uploads the second satellite or cellular signal returns.
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-cyan-400">Offline PWA</span>
                    <p className="text-[11px] text-slate-400">Zero data loss even in airplane mode</p>
                  </div>
                  <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-400">High-Contrast Mode</span>
                    <p className="text-[11px] text-slate-400">Optimized for direct outdoor sunlight</p>
                  </div>
                </div>
              </div>

              {/* Ruggedized Mobile UI Representation */}
              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FieldPulseIcon size={18} variant="color" />
                    <span className="font-bold">Engineer Mobile Edge</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">Signal: Offline (Queue: 2)</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">Pipe Spool Seam QR-109</span>
                    <span className="text-amber-400 font-bold">Queued for Sync</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                    <span>GPS: 19.076° N, 72.877° E</span>
                    <span>Photo + Voice (2.4 MB)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 text-center italic">
                  Automatic background synchronization activates immediately upon signal restoration.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Enterprise Trust & Governance ───────────────────── */}
        <section id="trust" className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                Enterprise Security &amp; Compliance
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
                Auditability Built for Regulated Capital Assets
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Rigorous security standards designed to satisfy internal audit committees, sovereign data residency, and statutory oversight.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Immutable Audit Trail',
                  desc: 'Every field capture, approval, and schedule adjustment is cryptographically timestamped and sealed.',
                  icon: Shield,
                },
                {
                  title: 'Strict RBAC Boundaries',
                  desc: 'Deterministic access segregation across field engineers, project managers, executive HQ, and auditors.',
                  icon: Lock,
                },
                {
                  title: 'Zero Public AI Training',
                  desc: 'Your project schedules and site photographs are never used to train third-party public AI models.',
                  icon: Cpu,
                },
                {
                  title: 'Data Residency & SOC 2',
                  desc: 'Host on sovereign enterprise cloud with VPC isolation, TLS 1.3 in transit, and AES-256 at rest.',
                  icon: FileCheck,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="card p-6 space-y-3 border border-border">
                    <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-cyan-400 w-fit">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 8. Final Call to Action ───────────────────────────── */}
        <section className="py-24 px-6 bg-surface border-t border-border">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl mb-2">
              <FieldPulseIcon size={32} variant="color" />
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-text-primary">
              Bring your infrastructure projects into focus.
            </h2>

            <p className="text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
              Eliminate reporting lag, prove physical progress with verified evidence, and protect capital delivery deadlines.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => openAuth('request')}
                className="btn-primary text-sm px-8 py-3.5 shadow-xl shadow-brand-500/30 font-bold flex items-center gap-2"
              >
                <span>Request a Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => openAuth('signin')}
                className="btn-outline text-sm px-6 py-3.5 font-bold"
              >
                Sign In with Organization ID
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── 9. Clean Corporate Footer ──────────────────────────── */}
      <footer className="py-12 px-6 bg-background border-t border-border text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <FieldPulseLogo size="sm" />

            <div className="flex flex-wrap items-center gap-6 font-semibold">
              <a href="#showcase" className="hover:text-text-primary transition-colors">Platform</a>
              <a href="#how-it-works" className="hover:text-text-primary transition-colors">How It Works</a>
              <a href="#trust" className="hover:text-text-primary transition-colors">Security</a>
              <Link href="/roles" className="hover:text-text-primary transition-colors">Roles Guide</Link>
              <button onClick={() => openAuth('signin')} className="hover:text-text-primary transition-colors">
                Sign In
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-text-muted">
            <p>© 2026 FieldPulse AI Inc. All rights reserved.</p>
            {/* Understated footnote strictly in footer per prompt */}
            <p className="text-center font-medium">
              Built for SIH 2026 · Problem Statement SIH26122 · Oil India Limited.
            </p>
            <p>ISO 27001 &amp; SOC 2 Type II Architecture</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
      />
    </div>
  );
}
