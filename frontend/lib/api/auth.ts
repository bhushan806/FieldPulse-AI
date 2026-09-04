/**
 * frontend/lib/api/auth.ts
 * Auth API calls — OTP, login, refresh, me.
 */
import apiClient from '@/lib/apiClient';

export async function requestOtp(phone: string) {
  const res = await apiClient.post('/api/auth/otp/request', { phone });
  return res.data;
}

export async function verifyOtp(phone: string, otp: string) {
  const res = await apiClient.post('/api/auth/otp/verify', { phone, otp });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await apiClient.post('/api/auth/login', { email, password });
  return res.data;
}

export async function getMe() {
  const res = await apiClient.get('/api/auth/me');
  return res.data;
}
