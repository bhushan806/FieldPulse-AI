'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  HardHat, 
  BarChart3, 
  Building2, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Eye, 
  Edit3, 
  UploadCloud, 
  Cpu, 
  Clock 
} from 'lucide-react';
import { FieldPulseLogo } from '@/components/shared/FieldPulseLogo';
import { AuthModal } from '@/components/shared/AuthModal';

export default function RolesGuidePage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const ROLES = [
    {
      id: 'engineer',
      title: 'Field Engineer',
      badge: 'On-Site Edge Capture',
      icon: HardHat,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      tagline: 'High-velocity evidence capture with zero manual paper reporting.',
      responsibilities: [
        'Capture geotagged photos, videos, and voice memos directly from remote sites',
        'Works fully offline with automatic background sync when cellular or satellite reconnects',
        'Scan equipment and pipe spool QR codes for instant activity identification',
        'Receive instant AI pre-validation on evidence quality before leaving site',
      ],
      capabilities: ['Mobile PWA', 'Offline Queue', 'GPS Geo-Fence', 'Voice-to-Text'],
    },
    {
      id: 'pm',
      title: 'Project Manager',
      badge: 'Execution & Approval Gate',
      icon: BarChart3,
      color: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
      tagline: 'Verify field claims, mitigate critical delays, and steer the live schedule.',
      responsibilities: [
        'Review AI-suggested activity matches with explainable visual similarity scores',
        'One-click approve or reject field submissions with contractor feedback',
        'Oversee dynamic S-Curves and automated milestone completion forecasts',
        'Manage contractor site rosters, telephone access, and daily work allocation',
      ],
      capabilities: ['Review Queue', 'Schedule Sync', 'Delay Mitigation', 'Roster Control'],
    },
    {
      id: 'hq',
      title: 'HQ Admin / Executive',
      badge: 'Portfolio Control Tower',
      icon: Building2,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      tagline: 'Complete portfolio-wide ground truth across all multi-billion capital assets.',
      responsibilities: [
        'Real-time portfolio command center tracking total projects, on-track, and at-risk assets',
        'AI Schedule Review Gate to ingest and parse complex Primavera/PDF schedules',
        'Automated delay escalation matrices notifying leadership of critical slippage',
        'System governance, platform security, and project manager provisioning',
      ],
      capabilities: ['Portfolio Analytics', 'AI Schedule Gate', 'Escalation Engine', 'Governance'],
    },
    {
      id: 'auditor',
      title: 'Compliance Auditor',
      badge: 'Independent Oversight',
      icon: ShieldCheck,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      tagline: 'Tamper-evident verification and immutable proof for capital expenditures.',
      responsibilities: [
        'Strictly read-only access ensuring independent compliance verification',
        'Trace every contractor billing milestone to its underlying timestamped visual proof',
        'Inspect immutable audit trails for project creation, schedule updates, and approvals',
        'Export verified audit packages for regulatory and financial reporting',
      ],
      capabilities: ['Read-Only Access', 'SHA-256 Chain', 'Audit Trails', 'Compliance Export'],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans selection:bg-brand-500/30">
      {/* ── Top Navigation ────────────────────────────────────── */}
      <nav className="h-16 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between max-w-7xl mx-auto">
        <FieldPulseLogo size="sm" href="/" />

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="btn-primary text-xs px-4 py-2"
          >
            Sign In / Request Access
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        {/* ── Hero ────────────────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
            Governance & Operational Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-text-primary tracking-tight">
            Designed for the Four Pillars of Capital Projects
          </h1>
          <p className="text-base text-text-secondary leading-relaxed">
            Enterprise infrastructure delivery demands strict segregation of duties. FieldPulse AI provides dedicated, purpose-built interfaces tailored to each stakeholder&apos;s operational mandate.
          </p>
        </div>

        {/* ── Role Cards Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                className="card p-8 space-y-6 hover:shadow-xl transition-all border border-border group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl border ${role.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-text-primary">{role.title}</h3>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                        {role.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm font-semibold text-text-primary leading-relaxed border-l-2 border-brand-500 pl-3">
                  {role.tagline}
                </p>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Key Responsibilities & Workflows
                  </h4>
                  <ul className="space-y-2">
                    {role.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-border flex flex-wrap gap-2">
                  {role.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2.5 py-1 rounded-lg bg-bg-muted border border-border text-[11px] font-semibold text-text-secondary"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Access Control Matrix ────────────────────────────── */}
        <div className="card p-8 space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-xl font-bold text-text-primary">Enterprise Access Permissions Matrix</h3>
            <p className="text-xs text-text-secondary mt-1">
              Deterministic, role-based boundary enforcement governed by SHA-256 JWT tokens.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-muted/50 text-text-muted uppercase tracking-wider font-bold">
                  <th className="p-3">Platform Capability</th>
                  <th className="p-3 text-center">Field Engineer</th>
                  <th className="p-3 text-center">Project Manager</th>
                  <th className="p-3 text-center">HQ Admin</th>
                  <th className="p-3 text-center">Compliance Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-secondary font-medium">
                {[
                  { feature: 'Submit Geotagged Field Captures', eng: true, pm: true, hq: false, aud: false },
                  { feature: 'Offline PWA & Background Sync', eng: true, pm: false, hq: false, aud: false },
                  { feature: 'Approve / Reject AI Submissions', eng: false, pm: true, hq: true, aud: false },
                  { feature: 'Publish & Modify Live Schedule WBS', eng: false, pm: true, hq: true, aud: false },
                  { feature: 'Portfolio-Wide Delay Forecasting', eng: false, pm: false, hq: true, aud: true },
                  { feature: 'Create Projects & Assign PMs', eng: false, pm: false, hq: true, aud: false },
                  { feature: 'Inspect Immutable Audit Trail Logs', eng: false, pm: true, hq: true, aud: true },
                  { feature: 'Configure AI Inference Thresholds', eng: false, pm: false, hq: true, aud: false },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-text-primary">{row.feature}</td>
                    <td className="p-3 text-center">{row.eng ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-text-muted">—</span>}</td>
                    <td className="p-3 text-center">{row.pm ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-text-muted">—</span>}</td>
                    <td className="p-3 text-center">{row.hq ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-text-muted">—</span>}</td>
                    <td className="p-3 text-center">{row.aud ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom Call to Action ───────────────────────────── */}
        <div className="card p-12 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl text-center space-y-6 border border-slate-800 shadow-2xl">
          <h3 className="text-3xl font-black tracking-tight">
            Ready to bring your infrastructure into focus?
          </h3>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Deploy FieldPulse AI across your field engineering, project management, and executive teams with zero workflow disruption.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="btn-primary text-sm px-6 py-3 shadow-lg shadow-brand-500/30"
            >
              Access Platform Workspace <ArrowRight className="w-4 h-4 ml-2 inline" />
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-8 px-6 bg-surface border-t border-border mt-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <FieldPulseLogo size="sm" />
          <p className="text-xs font-semibold text-text-muted">© 2026 FieldPulse AI Inc. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
