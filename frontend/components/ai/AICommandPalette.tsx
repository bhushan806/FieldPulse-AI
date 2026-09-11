'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  Sliders, 
  Command,
  X
} from 'lucide-react';
import { useAIStore } from '@/store/aiStore';
import { FieldPulseIcon } from '../shared/FieldPulseIcon';

export function AICommandPalette() {
  const router = useRouter();
  const { mode, setMode, close, addMessage, createThread, setStreaming } = useAIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = mode === 'palette';

  const QUICK_ACTIONS = [
    {
      id: 'qa-1',
      title: 'Run schedule delay forecast',
      category: 'AI Analysis',
      icon: TrendingUp,
      prompt: 'Run an ML completion forecast across all active projects and highlight critical-path delays.',
    },
    {
      id: 'qa-2',
      title: 'Audit unverified site captures',
      category: 'AI Analysis',
      icon: ShieldCheck,
      prompt: 'List all field captures submitted in the last 48 hours that have confidence under 75% or lack supervisor sign-off.',
    },
    {
      id: 'qa-3',
      title: 'Compare actual vs planned S-Curve',
      category: 'Schedule',
      icon: Calendar,
      prompt: 'Compare the actual cumulative progress against the baseline S-Curve and project milestone slippage.',
    },
    {
      id: 'qa-4',
      title: 'Draft executive portfolio progress brief',
      category: 'Reports',
      icon: FileText,
      prompt: 'Draft an executive briefing summarizing portfolio health, budget burn, and contractor milestones for this week.',
    },
    {
      id: 'qa-5',
      title: 'Navigate to Alerts Center',
      category: 'Navigation',
      icon: AlertTriangle,
      route: '/hq/alerts',
    },
    {
      id: 'qa-6',
      title: 'Configure System Settings & AI Thresholds',
      category: 'Navigation',
      icon: Sliders,
      route: '/hq/settings',
    },
  ];

  const filtered = QUICK_ACTIONS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (item: typeof QUICK_ACTIONS[0]) => {
    if (item.route) {
      close();
      router.push(item.route);
      return;
    }

    if (item.prompt) {
      createThread(item.title);
      addMessage({ role: 'user', content: item.prompt });
      setMode('panel');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      } else if (query.trim()) {
        createThread(query.slice(0, 36));
        addMessage({ role: 'user', content: query.trim() });
        setMode('panel');
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={close}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in z-10 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface">
          <FieldPulseIcon size={20} variant="color" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask FieldPulse AI or search commands... (e.g. delay forecast, audit captures)"
            className="flex-1 bg-transparent text-text-primary text-sm font-medium outline-none placeholder:text-text-muted"
          />
          {query ? (
            <button 
              type="button" 
              onClick={() => setQuery('')}
              className="p-1 text-text-muted hover:text-text-primary rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[11px] font-mono font-bold text-text-muted px-2 py-0.5 rounded bg-bg-muted border border-border">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar divide-y divide-border/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-text-primary">Press Enter to ask AI:</p>
              <p className="text-xs text-brand-600 dark:text-cyan-400 font-medium mt-1 italic">
                &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-brand-500/10 text-brand-600 dark:text-cyan-400' : 'hover:bg-bg-muted text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg border ${
                      isSelected 
                        ? 'bg-brand-500/15 border-brand-500/30 text-brand-600 dark:text-cyan-400' 
                        : 'bg-bg-muted border-border text-text-muted'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">{item.title}</p>
                      <span className="text-[10px] text-text-muted font-medium">{item.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100">
                      ↵ Enter
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-bg-muted/60 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Dismiss</span>
          </div>
          <span className="font-semibold text-text-secondary">FieldPulse Intelligence Core</span>
        </div>
      </div>
    </div>
  );
}
