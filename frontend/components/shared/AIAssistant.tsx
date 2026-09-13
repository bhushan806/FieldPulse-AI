'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAIStore } from '@/store/aiStore';
import { useAuthStore } from '@/store/authStore';
import { getUserProjectIds } from '@/lib/utils';
import { FieldPulseIcon } from './FieldPulseIcon';
import { AICommandPalette } from '../ai/AICommandPalette';
import { AIWorkspace } from '../ai/AIWorkspace';

export function AIAssistant() {
  const pathname = usePathname();
  const { user, accessToken, authStatus } = useAuthStore();
  const { mode, openPanel, togglePanel, openPalette, close, setContext, initForUser, resetUser } = useAIStore();

  const isAuthenticated = authStatus === 'AUTHENTICATED' && !!accessToken;
  const isEngineer = pathname?.startsWith('/engineer');

  // Sync user lifecycle and isolated conversation store
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initForUser(user.id, user.role, user.name);
    } else if (!isAuthenticated) {
      resetUser();
    }
  }, [isAuthenticated, user?.id, user?.role, user?.name, initForUser, resetUser]);

  // Sync current page entity into AI context
  useEffect(() => {
    if (!isAuthenticated) return;

    // Detect project from route e.g. /hq/projects/[id]
    const match = pathname?.match(/\/projects\/([a-zA-Z0-9]+)/);
    const projectIdFromRoute = match ? match[1] : null;
    const defaultProjectId = getUserProjectIds(user)[0] || null;

    const activePid = projectIdFromRoute || defaultProjectId;
    if (activePid) {
      setContext({
        entityType: 'project',
        entityId: activePid,
        entityName: projectIdFromRoute ? `Project ${projectIdFromRoute.slice(0, 8)}...` : undefined,
      });
    } else {
      setContext({
        entityType: 'portfolio',
        entityName: 'All Portfolio Projects',
      });
    }
  }, [pathname, isAuthenticated, user, setContext]);

  // Global ⌘K / Ctrl+K and ESC listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (mode === 'palette') {
          close();
        } else {
          openPalette();
        }
      } else if (e.key === 'Escape') {
        if (mode !== 'closed') {
          close();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, openPalette, close]);

  if (!isAuthenticated) return null;

  const buttonPosition = isEngineer
    ? 'bottom-24 right-4'
    : 'bottom-6 right-6';

  const isWorkspaceOpen = mode === 'full' || mode === 'panel';

  return (
    <>
      {/* ── Floating Pulse Line Trigger Button ──────────────────── */}
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Open FieldPulse AI Assistant (⌘K)"
        title="FieldPulse AI Intelligence (⌘K)"
        className={`fixed ${buttonPosition} z-40 p-3 bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 flex items-center gap-2 group hover:shadow-cyan-500/15 ${
          isWorkspaceOpen ? 'scale-0 pointer-events-none' : 'scale-100 hover:scale-105'
        }`}
      >
        <FieldPulseIcon size={22} variant="color" />
        <span className="text-xs font-bold tracking-tight pr-1 hidden sm:inline text-slate-200 group-hover:text-white">
          Pulse AI
        </span>
        <span className="hidden sm:inline text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
          ⌘K
        </span>
      </button>

      {/* ── Command Palette (⌘K) ──────────────────────────────── */}
      <AICommandPalette />

      {/* ── Full / Side Panel Workspace ───────────────────────── */}
      <AIWorkspace />
    </>
  );
}
