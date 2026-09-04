import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toasts: Toast[];
  loading: boolean;
  // Toast actions
  addNotification: (notification: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  // Compat alias used in some screens
  dismissNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const _create = (set: any, get: any): UIState => ({
  theme: 'dark',
  sidebarOpen: false,
  toasts: [],
  loading: false,

  addNotification: (notif) => {
    const id = crypto.randomUUID();
    set((state: UIState) => ({
      toasts: [...state.toasts, { ...notif, id }],
    }));
    if (notif.duration !== 0) {
      setTimeout(() => {
        set((state: UIState) => ({
          toasts: state.toasts.filter((n) => n.id !== id),
        }));
      }, notif.duration || 5000);
    }
  },

  removeToast: (id) =>
    set((state: UIState) => ({
      toasts: state.toasts.filter((n) => n.id !== id),
    })),

  // Alias so older screens that call dismissNotification still work
  dismissNotification: (id) =>
    set((state: UIState) => ({
      toasts: state.toasts.filter((n) => n.id !== id),
    })),

  setLoading: (loading) => set({ loading }),
  toggleSidebar: () => set((state: UIState) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
});

// Export BOTH names so any existing file works regardless of case
export const useUIStore = create<UIState>(_create);
export const useUiStore = useUIStore; // alias for legacy imports
