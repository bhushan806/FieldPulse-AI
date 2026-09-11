'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  Database, 
  Wifi, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  Sliders, 
  Bell, 
  Palette, 
  ShieldCheck,
  Zap,
  Radio,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useUIStore } from '@/store/uiStore';
import { useTheme } from 'next-themes';

export default function SystemSettingsPage() {
  const { addNotification } = useUIStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // AI & System Parameters State
  const [activityConfidence, setActivityConfidence] = useState(75);
  const [enableHeuristicFallback, setEnableHeuristicFallback] = useState(true);
  const [anomalySensitivity, setAnomalySensitivity] = useState<'standard' | 'high' | 'aggressive'>('high');
  const [forecastHorizon, setForecastHorizon] = useState(30);

  // Notification Parameters
  const [escalateDelays, setEscalateDelays] = useState(true);
  const [lowEvidenceAlert, setLowEvidenceAlert] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  // Regional State
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [currency, setCurrency] = useState('USD');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved settings if any
    const saved = localStorage.getItem('fieldpulse_system_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activityConfidence !== undefined) setActivityConfidence(parsed.activityConfidence);
        if (parsed.enableHeuristicFallback !== undefined) setEnableHeuristicFallback(parsed.enableHeuristicFallback);
        if (parsed.anomalySensitivity !== undefined) setAnomalySensitivity(parsed.anomalySensitivity);
        if (parsed.forecastHorizon !== undefined) setForecastHorizon(parsed.forecastHorizon);
        if (parsed.escalateDelays !== undefined) setEscalateDelays(parsed.escalateDelays);
        if (parsed.lowEvidenceAlert !== undefined) setLowEvidenceAlert(parsed.lowEvidenceAlert);
        if (parsed.dailyDigest !== undefined) setDailyDigest(parsed.dailyDigest);
        if (parsed.dateFormat !== undefined) setDateFormat(parsed.dateFormat);
        if (parsed.currency !== undefined) setCurrency(parsed.currency);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    const settings = {
      activityConfidence,
      enableHeuristicFallback,
      anomalySensitivity,
      forecastHorizon,
      escalateDelays,
      lowEvidenceAlert,
      dailyDigest,
      dateFormat,
      currency,
    };
    localStorage.setItem('fieldpulse_system_settings', JSON.stringify(settings));

    setTimeout(() => {
      setSaving(false);
      addNotification({
        type: 'success',
        title: 'Settings Saved',
        message: 'System settings and AI parameters updated successfully.',
      });
    }, 400);
  };

  const handleReset = () => {
    setActivityConfidence(75);
    setEnableHeuristicFallback(true);
    setAnomalySensitivity('high');
    setForecastHorizon(30);
    setEscalateDelays(true);
    setLowEvidenceAlert(true);
    setDailyDigest(false);
    setDateFormat('YYYY-MM-DD');
    setCurrency('USD');
    localStorage.removeItem('fieldpulse_system_settings');

    addNotification({
      type: 'info',
      title: 'Reset to Defaults',
      message: 'System configuration restored to baseline defaults.',
    });
  };

  return (
    <div className="space-y-6 animate-in pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader 
          title="System Settings" 
          subtitle="Configure platform operational parameters, AI engine thresholds, and UI preferences."
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="btn-outline px-4 py-2 text-xs flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-5 py-2 text-xs flex items-center gap-2 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Services Health Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            name: 'FastAPI Backend',
            status: 'Operational',
            detail: 'Port 8000 • Latency 14ms',
            icon: Zap,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            name: 'MongoDB Atlas',
            status: 'Connected',
            detail: 'ReplicaSet • Read/Write OK',
            icon: Database,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            name: 'AI Extraction Engine',
            status: 'Active',
            detail: 'Hugging Face + Heuristics',
            icon: Cpu,
            color: 'text-brand-500',
            bg: 'bg-brand-500/10 border-brand-500/20',
          },
          {
            name: 'Live WebSockets',
            status: 'Synced',
            detail: 'Real-time telemetry stream',
            icon: Radio,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
        ].map((srv) => (
          <div key={srv.name} className="card p-4 flex items-center gap-3.5">
            <div className={`p-2.5 rounded-xl border ${srv.bg} ${srv.color}`}>
              <srv.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-primary">{srv.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">{srv.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Engine & Intelligence Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Intelligence Card */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">AI Inference & Extraction Controls</h3>
                <p className="text-xs text-text-secondary">Tune matching thresholds and document parsing fallbacks</p>
              </div>
            </div>

            {/* Confidence Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-primary">
                  Activity Auto-Match Confidence Threshold
                </label>
                <span className="px-2.5 py-1 rounded-md bg-brand-500/15 text-brand-600 dark:text-brand-400 font-mono text-xs font-bold">
                  {activityConfidence}%
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Field evidence captures matching project activities with similarity above this score will be auto-suggested.
              </p>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={activityConfidence}
                onChange={(e) => setActivityConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-muted rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-[10px] text-text-muted font-semibold">
                <span>50% (Permissive)</span>
                <span>75% (Recommended)</span>
                <span>95% (Strict)</span>
              </div>
            </div>

            {/* Heuristic Fallback Toggle */}
            <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-text-primary">
                  Heuristic Parsing Fallback
                </div>
                <p className="text-xs text-text-secondary">
                  When Hugging Face LLM rate limits or offline, automatically use rule-based pattern extraction for schedule PDFs.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={enableHeuristicFallback}
                  onChange={(e) => setEnableHeuristicFallback(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Anomaly Delay Sensitivity */}
            <div className="space-y-2 pt-4 border-t border-border">
              <label className="text-sm font-semibold text-text-primary">
                Delay Anomaly Sensitivity
              </label>
              <p className="text-xs text-text-secondary">
                Determines how aggressively the forecasting engine flags behind-schedule activities.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {(['standard', 'high', 'aggressive'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setAnomalySensitivity(lvl)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all border ${
                      anomalySensitivity === lvl
                        ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'bg-surface border-border text-text-secondary hover:bg-bg-muted'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Forecast Horizon */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-primary">
                  S-Curve Forecasting Horizon (Days)
                </label>
                <span className="font-mono text-xs font-bold text-text-primary">
                  {forecastHorizon} Days
                </span>
              </div>
              <input
                type="number"
                min="7"
                max="90"
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(parseInt(e.target.value) || 30)}
                className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Operational Alerts Card */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Alerts & Escalation Matrix</h3>
                <p className="text-xs text-text-secondary">Manage automatic alert routing and notification triggers</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Escalate Critical Delays to HQ</div>
                  <div className="text-xs text-text-secondary">Notify headquarters admins immediately when project delays exceed 3 days.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={escalateDelays}
                    onChange={(e) => setEscalateDelays(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Low Evidence Warning Trigger</div>
                  <div className="text-xs text-text-secondary">Warn project managers when activities progress without sufficient photo/video proof.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={lowEvidenceAlert}
                    onChange={(e) => setLowEvidenceAlert(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Executive Daily Digest</div>
                  <div className="text-xs text-text-secondary">Consolidate daily project KPIs into a single morning notification.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Appearance & Localization */}
        <div className="space-y-6">
          {/* Appearance Card */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Theme & Interface</h3>
                <p className="text-xs text-text-secondary">Customize visual aesthetic</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-text-primary">Display Theme</label>
              {mounted && (
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      theme === 'light'
                        ? 'bg-brand-500/15 border-brand-500 text-brand-600 shadow-sm'
                        : 'bg-surface border-border text-text-secondary hover:bg-bg-muted'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-bold">Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-brand-500/15 border-brand-500 text-brand-400 shadow-sm'
                        : 'bg-surface border-border text-text-secondary hover:bg-bg-muted'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-brand-500" />
                    <span className="text-xs font-bold">Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      theme === 'system'
                        ? 'bg-brand-500/15 border-brand-500 text-brand-500 shadow-sm'
                        : 'bg-surface border-border text-text-secondary hover:bg-bg-muted'
                    }`}
                  >
                    <Laptop className="w-5 h-5 text-text-muted" />
                    <span className="text-xs font-bold">System</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Regional Settings */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Localization</h3>
                <p className="text-xs text-text-secondary">Date formats & units</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs font-medium text-text-primary outline-none focus:border-brand-500"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (UK / International)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Financial Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs font-medium text-text-primary outline-none focus:border-brand-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
