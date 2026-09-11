import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIMode = 'closed' | 'panel' | 'full' | 'palette';

export interface AICitation {
  id: string;
  type: 'capture' | 'activity' | 'document' | 'alert';
  label: string;
  refId: string;
  snippet?: string;
  href?: string;
}

export interface AIAction {
  id: string;
  label: string;
  actionType: 'navigate' | 'report' | 'alert' | 'copy';
  payload?: any;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: AICitation[];
  actions?: AIAction[];
  projectCard?: {
    id: string;
    name: string;
    status: 'on_track' | 'at_risk' | 'delayed';
    progress: number;
    delayDays?: number;
  };
}

export interface AIThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  messages: AIMessage[];
}

export interface AIContextEntity {
  entityType?: 'project' | 'activity' | 'alert' | 'portfolio';
  entityId?: string;
  entityName?: string;
}

export interface AIState {
  mode: AIMode;
  activeThreadId: string;
  threads: AIThread[];
  context: AIContextEntity | null;
  isStreaming: boolean;
  selectedModel: string;

  // Actions
  setMode: (mode: AIMode) => void;
  openPanel: () => void;
  openFull: () => void;
  openPalette: () => void;
  close: () => void;
  togglePanel: () => void;
  
  setContext: (context: AIContextEntity | null) => void;
  setSelectedModel: (model: string) => void;

  createThread: (title?: string) => string;
  switchThread: (id: string) => void;
  deleteThread: (id: string) => void;
  pinThread: (id: string) => void;

  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string, citations?: AICitation[], actions?: AIAction[]) => void;
  setStreaming: (streaming: boolean) => void;
}

const DEFAULT_THREAD_ID = 'thread-default';

const INITIAL_THREADS: AIThread[] = [
  {
    id: DEFAULT_THREAD_ID,
    title: 'Sector 4 Pipeline Progress Analysis',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: true,
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'What is the current status of the Sector 4 Pipeline and why is it delayed?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Based on verified field telemetry and daily capture logs, **Sector 4 Pipeline** is currently **Delayed by 3.5 days** against the baseline WBS schedule.\n\n### Root Cause Analysis\n1. **Hydrostatic Pressure Testing (Activity EXC-04)**\n   The latest video capture submitted by Site Engineer Rajesh Kumar shows hydrostatic testing was halted due to pressure drop variance in Section B.\n2. **Pending Welder Qualification Sign-off**\n   Visual inspection of weld seam #W-104 requires non-destructive testing (NDT) certification before backfilling can proceed.`,
        timestamp: new Date(Date.now() - 3550000).toISOString(),
        citations: [
          {
            id: 'cit-1',
            type: 'capture',
            label: 'Field Capture #C-4092 (Video)',
            refId: 'C-4092',
            snippet: 'Hydrostatic pressure test halted at 14:32 due to valve seal pressure drop.',
          },
          {
            id: 'cit-2',
            type: 'activity',
            label: 'WBS Activity: EXC-04',
            refId: 'EXC-04',
            snippet: 'Planned Completion: Sep 12, 2026. Current forecast: Sep 16, 2026.',
          },
        ],
        projectCard: {
          id: '6a9a4ca203626c13e12295eb',
          name: 'Sector 4 Pipeline',
          status: 'delayed',
          progress: 42,
          delayDays: 3.5,
        },
        actions: [
          {
            id: 'act-1',
            label: 'Open Project Setup',
            actionType: 'navigate',
            payload: '/hq/projects/6a9a4ca203626c13e12295eb/setup',
          },
          {
            id: 'act-2',
            label: 'Review Delay Alerts',
            actionType: 'navigate',
            payload: '/hq/alerts',
          },
        ],
      },
    ],
  },
];

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      mode: 'closed',
      activeThreadId: DEFAULT_THREAD_ID,
      threads: INITIAL_THREADS,
      context: null,
      isStreaming: false,
      selectedModel: 'Mistral-7B + CLIP Vision',

      setMode: (mode) => set({ mode }),
      openPanel: () => set({ mode: 'panel' }),
      openFull: () => set({ mode: 'full' }),
      openPalette: () => set({ mode: 'palette' }),
      close: () => set({ mode: 'closed' }),
      togglePanel: () => set((s) => ({ mode: s.mode === 'panel' ? 'closed' : 'panel' })),

      setContext: (context) => set({ context }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),

      createThread: (title = 'New Analysis') => {
        const newId = `thread-${Date.now()}`;
        const newThread: AIThread = {
          id: newId,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        };
        set((state) => ({
          threads: [newThread, ...state.threads],
          activeThreadId: newId,
        }));
        return newId;
      },

      switchThread: (id) => set({ activeThreadId: id }),

      deleteThread: (id) => {
        set((state) => {
          const remaining = state.threads.filter((t) => t.id !== id);
          const nextActive = remaining.length > 0 ? remaining[0].id : get().createThread();
          return {
            threads: remaining,
            activeThreadId: nextActive,
          };
        });
      },

      pinThread: (id) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === id ? { ...t, pinned: !t.pinned } : t
          ),
        }));
      },

      addMessage: (msg) => {
        const newMsg: AIMessage = {
          ...msg,
          id: `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          threads: state.threads.map((t) => {
            if (t.id === state.activeThreadId) {
              const updatedTitle =
                t.messages.length === 0 && msg.role === 'user'
                  ? msg.content.slice(0, 42) + (msg.content.length > 42 ? '...' : '')
                  : t.title;
              return {
                ...t,
                title: updatedTitle,
                updatedAt: new Date().toISOString(),
                messages: [...t.messages, newMsg],
              };
            }
            return t;
          }),
        }));
      },

      updateLastMessage: (content, citations, actions) => {
        set((state) => ({
          threads: state.threads.map((t) => {
            if (t.id === state.activeThreadId && t.messages.length > 0) {
              const messages = [...t.messages];
              const last = messages[messages.length - 1];
              messages[messages.length - 1] = {
                ...last,
                content,
                citations: citations ?? last.citations,
                actions: actions ?? last.actions,
              };
              return { ...t, messages, updatedAt: new Date().toISOString() };
            }
            return t;
          }),
        }));
      },

      setStreaming: (isStreaming) => set({ isStreaming }),
    }),
    {
      name: 'fieldpulse_ai_workspace',
      partialize: (state) => ({
        threads: state.threads,
        activeThreadId: state.activeThreadId,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
