'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, ArrowRight, Loader2, CheckCircle2, Shield, Building2, BarChart3, HardHat } from 'lucide-react';
import { login, getMe } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { FieldPulseLogo } from './FieldPulseLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'request';
}

const ROLE_ROUTES: Record<string, string> = {
  hq_admin: '/hq/portfolio',
  project_manager: '/pm/dashboard',
  auditor: '/hq/portfolio',
  platform_admin: '/admin/dashboard',
  site_engineer: '/engineer/capture',
};

const DEMO_PERSONAS = [
  {
    role: 'hq_admin',
    label: 'HQ Admin',
    name: 'Ankit Verma',
    email: 'hq@fieldpulse.dev',
    icon: Building2,
  },
  {
    role: 'project_manager',
    label: 'Project Manager',
    name: 'Priya Sharma',
    email: 'pm@fieldpulse.dev',
    icon: BarChart3,
  },
  {
    role: 'auditor',
    label: 'Auditor',
    name: 'Sonal Mehta',
    email: 'auditor@fieldpulse.dev',
    icon: Shield,
  },
  {
    role: 'site_engineer',
    label: 'Field Engineer',
    name: 'Ramesh Kumar',
    email: '+91 98765 43210',
    icon: HardHat,
    isOtp: true,
  },
];

export function AuthModal({ isOpen, onClose, initialTab = 'signin' }: AuthModalProps) {
  const router = useRouter();
  const { setAuth, updateUser } = useAuthStore();
  const { addNotification } = useUIStore();

  const [tab, setTab] = useState<'signin' | 'request'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Request Access form state
  const [orgName, setOrgName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [projectScale, setProjectScale] = useState('$100M+');
  const [requestSuccess, setRequestSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (email.startsWith('+') || email.replace(/\D/g, '').length >= 10) {
      onClose();
      router.push('/login-engineer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const auth = await login(email.trim(), password);
      setAuth({
        accessToken: auth.accessToken || auth.access_token,
        refreshToken: auth.refreshToken || auth.refresh_token || '',
        role: auth.role,
      });

      try {
        const me = await getMe();
        if (me) {
          updateUser({
            id: me.id || me._id || '',
            name: me.name || '',
            email: me.email || '',
            role: me.role || auth.role,
            project_ids: me.project_ids || me.projectIds || [],
          });
        }
      } catch {
        /* profile fetch fallback */
      }

      addNotification({
        type: 'success',
        title: 'Welcome Back',
        message: 'Signed in successfully',
      });

      onClose();
      const target = ROLE_ROUTES[auth.role] || '/hq/portfolio';
      router.push(target);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Invalid credentials. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = (persona: typeof DEMO_PERSONAS[0]) => {
    if (persona.isOtp) {
      onClose();
      router.push('/login-engineer');
      return;
    }
    setEmail(persona.email);
    setPassword('Password123!');
    setError('');
  };

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSuccess(true);
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Access Request Received',
        message: 'Our enterprise deployment team will contact you within 24 hours.',
      });
      onClose();
      setRequestSuccess(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden z-10 animate-fade-in flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface flex items-center justify-between">
          <FieldPulseLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-bg-muted/40 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('signin')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              tab === 'signin'
                ? 'border-brand-500 text-brand-600 dark:text-cyan-400 bg-surface'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('request')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              tab === 'request'
                ? 'border-brand-500 text-brand-600 dark:text-cyan-400 bg-surface'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Request Access
          </button>
        </div>

        <div className="p-6">
          {tab === 'signin' ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Sign in to your organization</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Enter your credentials. Roles and project scopes are auto-detected.
                </p>
              </div>

              {/* Demo Persona Quick-Fill */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Quick Demo Access (Select Persona)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_PERSONAS.map((p) => {
                    const isSelected = email === p.email;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.role}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-cyan-400 font-bold'
                            : 'bg-surface border-border hover:bg-bg-muted text-text-secondary'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 text-brand-500" />
                        <div className="truncate text-xs">
                          <div className="font-bold truncate">{p.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-danger-bg text-danger text-xs font-semibold rounded-xl border border-danger/20">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Work Email / Phone
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1 flex items-center justify-between">
                    <span>Default demo password: <code className="text-text-secondary bg-bg-muted px-1.5 py-0.5 rounded font-mono">Password123!</code></span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Request Enterprise Deployment</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  FieldPulse is deployed for capital infrastructure operators managing $50M+ project portfolios.
                </p>
              </div>

              {requestSuccess ? (
                <div className="p-6 bg-success-bg border border-success/30 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
                  <h4 className="text-sm font-bold text-success">Request Registered</h4>
                  <p className="text-xs text-text-secondary">
                    Our solutions engineering team will provision your dedicated sandbox environment.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRequestAccess} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Organization / Operator Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Oil India Limited"
                      required
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Work Email</label>
                    <input
                      type="email"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="executive@operator.com"
                      required
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Active Capital Project Scale</label>
                    <select
                      value={projectScale}
                      onChange={(e) => setProjectScale(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-brand-500 font-semibold"
                    >
                      <option value="$50M - $250M">$50M – $250M in active capital works</option>
                      <option value="$250M - $1B">$250M – $1B in active capital works</option>
                      <option value="$1B+">$1B+ multi-package infrastructure</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 shadow-md mt-2"
                  >
                    <span>Request Access & Sandbox</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
