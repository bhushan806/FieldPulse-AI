import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAIStore } from '@/store/aiStore';

export type UserRole = 'site_engineer' | 'project_manager' | 'hq_admin' | 'auditor' | 'platform_admin';

/**
 * Explicit auth lifecycle status.
 * AUTH_INITIALIZING: Zustand hasn't yet rehydrated from localStorage.
 * AUTHENTICATED:     Token exists and user is considered logged in.
 * UNAUTHENTICATED:   Hydration complete but no valid token found.
 * AUTH_ERROR:        Token was invalidated (e.g. 401 with no refresh).
 */
export type AuthStatus = 'AUTH_INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'AUTH_ERROR';

export interface CurrentUser {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  project_ids: string[];
}

export interface AuthState {
  user: CurrentUser | null;
  role: UserRole | null;
  accessToken: string | null;
  refreshToken: string | null;
  authStatus: AuthStatus;
  isAuthenticated: () => boolean;
  setAuth: (data: { accessToken: string; refreshToken: string; role?: UserRole }) => void;
  updateUser: (user: CurrentUser) => void;
  logout: () => void;
  setSelectedProject: (projectId: string) => void;
  selectedProjectId: string | null;
  /** @deprecated Use authStatus instead */
  isHydrated: boolean;
  setHydrated: () => void;
  setAuthError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      accessToken: null,
      refreshToken: null,
      selectedProjectId: null,
      // Start as AUTH_INITIALIZING — Zustand hasn't rehydrated yet
      authStatus: 'AUTH_INITIALIZING' as const,
      // Legacy — kept for backwards compat, mirrors authStatus !== AUTH_INITIALIZING
      isHydrated: false,

      setHydrated: () => set({ isHydrated: true }),

      isAuthenticated: () => !!get().accessToken,

      setAuth: (data) => {
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          // Store role if provided directly (from login response)
          role: data.role ?? get().role,
          authStatus: 'AUTHENTICATED',
          isHydrated: true,
        });
        if (typeof document !== 'undefined') {
          document.cookie = `accessToken=${data.accessToken}; path=/; max-age=3600; SameSite=Lax`;
          if (data.role) document.cookie = `role=${data.role}; path=/; max-age=3600; SameSite=Lax`;
        }
      },

      updateUser: (user) => {
        const projectIds = (user as CurrentUser & { projectIds?: string[] }).project_ids
          ?? (user as CurrentUser & { projectIds?: string[] }).projectIds
          ?? [];
        const normalized: CurrentUser = {
          ...user,
          project_ids: projectIds,
        };
        set({ user: normalized, role: normalized.role });
        if (typeof document !== 'undefined') {
          document.cookie = `role=${normalized.role}; path=/; max-age=3600; SameSite=Lax`;
        }
        if (normalized?.id) {
          useAIStore.getState().initForUser(normalized.id, normalized.role, normalized.name);
        }
      },

      logout: () => {
        useAIStore.getState().resetUser();
        set({
          user: null,
          role: null,
          accessToken: null,
          refreshToken: null,
          selectedProjectId: null,
          authStatus: 'UNAUTHENTICATED',
        });
        if (typeof document !== 'undefined') {
          document.cookie = 'accessToken=; Max-Age=0; path=/; SameSite=Lax';
          document.cookie = 'role=; Max-Age=0; path=/; SameSite=Lax';
        }
      },

      setAuthError: () => {
        useAIStore.getState().resetUser();
        set({
          user: null,
          role: null,
          accessToken: null,
          refreshToken: null,
          selectedProjectId: null,
          authStatus: 'AUTH_ERROR',
        });
        if (typeof document !== 'undefined') {
          document.cookie = 'accessToken=; Max-Age=0; path=/; SameSite=Lax';
          document.cookie = 'role=; Max-Age=0; path=/; SameSite=Lax';
        }
      },

      setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Set explicit status based on whether a token was found in storage
          const status: AuthStatus = state.accessToken ? 'AUTHENTICATED' : 'UNAUTHENTICATED';
          state.authStatus = status;
          state.isHydrated = true;
          if (state.user?.id && state.accessToken) {
            useAIStore.getState().initForUser(state.user.id, state.user.role, state.user.name);
          }
        }
      },
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        selectedProjectId: state.selectedProjectId,
      }),
    }
  )
);
