import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Returns the current access and refresh tokens from the auth store. */
export function getTokens() {
  const { accessToken, refreshToken } = useAuthStore.getState();
  return { access: accessToken, refresh: refreshToken };
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401 refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/refresh`,
          { refreshToken }
        );
        const { accessToken } = res.data;
        useAuthStore.getState().setAuth({ accessToken, refreshToken });
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        // Use setAuthError so RoleGuard can handle the redirect via Next.js router
        useAuthStore.getState().setAuthError();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Named export alias for files that import { apiClient }
export { apiClient };

/**
 * Convenience wrapper for type-safe API requests.
 * Used by dashboard.ts and other API modules.
 */
export async function apiRequest<T = unknown>(
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown | FormData;
    params?: Record<string, string | number | boolean | undefined>;
  }
): Promise<T> {
  const method = options?.method ?? 'GET';
  const response = await apiClient.request<T>({
    url,
    method,
    data: options?.body,
    params: options?.params,
    // Let axios set Content-Type automatically (important for FormData multipart)
    headers: options?.body instanceof FormData
      ? { 'Content-Type': undefined }
      : undefined,
  });
  return response.data;
}
