import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';

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
  currentUserId: string | null;
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

  initForUser: (userId: string, role?: string, userName?: string) => Promise<void>;
  resetUser: () => void;

  createThread: (title?: string) => string;
  switchThread: (id: string) => void;
  deleteThread: (id: string) => void;
  pinThread: (id: string) => void;

  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string, citations?: AICitation[], actions?: AIAction[]) => void;
  setStreaming: (streaming: boolean) => void;
}

function getWelcomeThread(role?: string, userName?: string): AIThread {
  const firstName = userName ? userName.split(' ')[0] : 'there';
  const now = new Date().toISOString();
  let welcomeContent = '';

  switch (role) {
    case 'site_engineer':
      welcomeContent = `Hello ${firstName}. I am your FieldPulse Site Intelligence Assistant.\n\nI can help you review daily capture logs, verify checklists before supervisor sign-off, detect site safety anomalies, and track actual physical progress. How can I assist you on site today?`;
      break;
    case 'project_manager':
      welcomeContent = `Hello ${firstName}. I am your FieldPulse Project Management Assistant.\n\nI can help you monitor critical path delays, audit the capture review queue, track milestone slippage, and analyze subcontractor velocity. What would you like to review?`;
      break;
    case 'hq_admin':
    case 'platform_admin':
      welcomeContent = `Hello ${firstName}. I am your FieldPulse Executive Intelligence Assistant.\n\nI can provide cross-portfolio S-Curve comparisons, draft executive progress briefings, and analyze budget variance risks across all active infrastructure packages. What shall we analyze today?`;
      break;
    case 'auditor':
      welcomeContent = `Hello ${firstName}. I am your FieldPulse Compliance Assistant.\n\nI can help you audit unverified field captures, inspect cryptographic SHA-256 evidence hashes, and check geo-fence compliance across all submissions. How can I assist your audit?`;
      break;
    default:
      welcomeContent = `Hello ${firstName}. I am FieldPulse AI, your infrastructure intelligence assistant.\n\nI can assist you with site telemetry, progress forecasts, and quality assurance. How can I help you today?`;
      break;
  }

  const threadId = `thread-${Date.now()}`;
  return {
    id: threadId,
    title: 'Welcome & Overview',
    createdAt: now,
    updatedAt: now,
    pinned: true,
    messages: [
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: welcomeContent,
        timestamp: now,
      },
    ],
  };
}

function loadCachedThreads(userId: string): { threads: AIThread[]; activeThreadId: string; selectedModel?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`fieldpulse_ai_threads_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.threads) && parsed.threads.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[AIStore] Error reading user cache:', err);
  }
  return null;
}

function saveUserCache(
  userId: string | null,
  data: { threads: AIThread[]; activeThreadId: string; selectedModel: string }
) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`fieldpulse_ai_threads_${userId}`, JSON.stringify(data));
  } catch (err) {
    console.error('[AIStore] Error saving user cache:', err);
  }
}

// Clear legacy unpartitioned workspace cache if present
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('fieldpulse_ai_workspace');
  } catch {}
}

export const useAIStore = create<AIState>((set, get) => ({
  mode: 'closed',
  currentUserId: null,
  activeThreadId: '',
  threads: [],
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

  initForUser: async (userId: string, role?: string, userName?: string) => {
    const current = get();

    // If switching users or not initialized for this user, clear in-memory threads immediately
    if (current.currentUserId !== userId) {
      set({
        currentUserId: userId,
        threads: [],
        activeThreadId: '',
      });
    }

    // 1. Try to load from user-scoped localStorage cache
    const cached = loadCachedThreads(userId);
    if (cached && cached.threads.length > 0) {
      set({
        currentUserId: userId,
        threads: cached.threads,
        activeThreadId: cached.activeThreadId || cached.threads[0].id,
        selectedModel: cached.selectedModel || current.selectedModel,
      });
    } else {
      // Generate clean welcoming thread tailored to the user's role
      const welcome = getWelcomeThread(role, userName);
      set({
        currentUserId: userId,
        threads: [welcome],
        activeThreadId: welcome.id,
      });
      saveUserCache(userId, {
        threads: [welcome],
        activeThreadId: welcome.id,
        selectedModel: current.selectedModel,
      });
    }

    // 2. Asynchronously fetch user threads from MongoDB backend
    try {
      const res = await apiClient.get<Array<{
        id: string;
        user_id: string;
        project_id?: string;
        title: string;
        pinned?: boolean;
        messages: AIMessage[];
        created_at: string;
        updated_at: string;
      }>>('/api/ai/threads');

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const remoteThreads: AIThread[] = res.data.map((d) => ({
          id: d.id,
          title: d.title,
          pinned: d.pinned || false,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          messages: d.messages || [],
        }));

        // Only update if current user is still the one we fetched for
        if (get().currentUserId === userId) {
          const currentActive = get().activeThreadId;
          const nextActive = remoteThreads.some((t) => t.id === currentActive)
            ? currentActive
            : remoteThreads[0].id;

          set({
            threads: remoteThreads,
            activeThreadId: nextActive,
          });

          saveUserCache(userId, {
            threads: remoteThreads,
            activeThreadId: nextActive,
            selectedModel: get().selectedModel,
          });
        }
      }
    } catch (err) {
      // If offline or network error, cached/local threads remain in place
      console.warn('[AIStore] Could not fetch remote threads:', err);
    }
  },

  resetUser: () => {
    set({
      currentUserId: null,
      threads: [],
      activeThreadId: '',
      mode: 'closed',
      context: null,
      isStreaming: false,
    });
  },

  createThread: (title = 'New Analysis') => {
    const newId = `thread-${Date.now()}`;
    const newThread: AIThread = {
      id: newId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const updatedThreads = [newThread, ...get().threads];
    set({
      threads: updatedThreads,
      activeThreadId: newId,
    });

    const userId = get().currentUserId;
    saveUserCache(userId, {
      threads: updatedThreads,
      activeThreadId: newId,
      selectedModel: get().selectedModel,
    });

    // Asynchronously create thread on backend
    if (userId) {
      apiClient.post('/api/ai/threads', {
        title,
        messages: [],
      }).then((res) => {
        if (res.data?.id) {
          const backendId = res.data.id;
          set((state) => {
            const remapped = state.threads.map((t) =>
              t.id === newId ? { ...t, id: backendId } : t
            );
            return {
              threads: remapped,
              activeThreadId: state.activeThreadId === newId ? backendId : state.activeThreadId,
            };
          });
          saveUserCache(get().currentUserId, {
            threads: get().threads,
            activeThreadId: get().activeThreadId,
            selectedModel: get().selectedModel,
          });
        }
      }).catch((e) => {
        console.warn('[AIStore] Failed to persist thread to backend:', e);
      });
    }

    return newId;
  },

  switchThread: (id) => {
    set({ activeThreadId: id });
    saveUserCache(get().currentUserId, {
      threads: get().threads,
      activeThreadId: id,
      selectedModel: get().selectedModel,
    });
  },

  deleteThread: (id) => {
    const remaining = get().threads.filter((t) => t.id !== id);
    const nextActive = remaining.length > 0 ? remaining[0].id : '';
    set({
      threads: remaining,
      activeThreadId: nextActive,
    });

    const userId = get().currentUserId;
    saveUserCache(userId, {
      threads: remaining,
      activeThreadId: nextActive,
      selectedModel: get().selectedModel,
    });

    if (remaining.length === 0) {
      get().createThread();
    }

    if (userId) {
      apiClient.delete(`/api/ai/threads/${id}`).catch((e) => {
        console.warn('[AIStore] Failed to delete thread on backend:', e);
      });
    }
  },

  pinThread: (id) => {
    let newPinned = false;
    const updatedThreads = get().threads.map((t) => {
      if (t.id === id) {
        newPinned = !t.pinned;
        return { ...t, pinned: newPinned };
      }
      return t;
    });

    set({ threads: updatedThreads });

    const userId = get().currentUserId;
    saveUserCache(userId, {
      threads: updatedThreads,
      activeThreadId: get().activeThreadId,
      selectedModel: get().selectedModel,
    });

    if (userId) {
      apiClient.put(`/api/ai/threads/${id}`, { pinned: newPinned }).catch((e) => {
        console.warn('[AIStore] Failed to pin thread on backend:', e);
      });
    }
  },

  addMessage: (msg) => {
    const newMsg: AIMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const currentActiveId = get().activeThreadId;
    const updatedThreads = get().threads.map((t) => {
      if (t.id === currentActiveId) {
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
    });

    set({ threads: updatedThreads });

    saveUserCache(get().currentUserId, {
      threads: updatedThreads,
      activeThreadId: currentActiveId,
      selectedModel: get().selectedModel,
    });
  },

  updateLastMessage: (content, citations, actions) => {
    const currentActiveId = get().activeThreadId;
    const updatedThreads = get().threads.map((t) => {
      if (t.id === currentActiveId && t.messages.length > 0) {
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
    });

    set({ threads: updatedThreads });

    saveUserCache(get().currentUserId, {
      threads: updatedThreads,
      activeThreadId: currentActiveId,
      selectedModel: get().selectedModel,
    });
  },

  setStreaming: (isStreaming) => set({ isStreaming }),
}));
