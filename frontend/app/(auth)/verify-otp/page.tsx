'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export default function VerifyOTP() {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [phone, setPhone] = useState<string | null>(null);
  const router = useRouter();
  const { addNotification } = useUIStore();
  const { setAuth, updateUser } = useAuthStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    router.prefetch('/engineer/home');
    const storedPhone = sessionStorage.getItem('otp-phone');
    if (!storedPhone) {
      router.replace('/login-engineer');
    } else {
      setPhone(storedPhone);
    }
  }, [router]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(char => isNaN(Number(char)))) return;
    
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      newOtp[index] = char;
    });
    setOtp(newOtp);
    
    // Focus the appropriate input after paste
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      addNotification({ type: 'error', message: 'Please enter a valid 6-digit OTP' });
      return;
    }
    
    setLoading(true);
    try {
      // 1. Verify OTP
      const authRes = await apiClient.post(API_ENDPOINTS.auth.otpVerify, { 
        phone, 
        otp: otpValue 
      });
      
      setAuth({ 
        accessToken: authRes.data.access_token || authRes.data.accessToken, 
        refreshToken: authRes.data.refresh_token || authRes.data.refreshToken,
        role: authRes.data.role || 'site_engineer',
      });
      
      if (authRes.data.user_id) {
        updateUser({
          id: authRes.data.user_id,
          name: authRes.data.name || 'Site Engineer',
          phone: phone,
          role: authRes.data.role || 'site_engineer',
          project_ids: authRes.data.project_ids || [],
        });
      }

      // Background profile fetch without delaying navigation
      apiClient.get(API_ENDPOINTS.auth.me).then((meRes) => {
        if (meRes?.data) updateUser(meRes.data);
      }).catch(() => {});
      
      addNotification({ type: 'success', message: 'Verification successful!' });
      
      // Clean up
      sessionStorage.removeItem('otp-phone');
      
      // 2. Instant Redirect to Engineer Dashboard
      router.replace('/engineer/home');
      
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Invalid OTP. Please try again.' 
      });
      setOtp([...otp.map(() => '')]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || !phone) return;
    
    try {
      await apiClient.post(API_ENDPOINTS.auth.otpRequest, { phone });
      addNotification({ type: 'info', message: 'OTP resent successfully!' });
      setTimeLeft(60);
      setOtp([...otp.map(() => '')]);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Failed to resend OTP.' 
      });
    }
  };

  if (!phone) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-in glass-card p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6 p-4 rounded-xl bg-orange-500/10 text-orange-400">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Verify Phone</h2>
          <p className="text-slate-400 text-center text-sm">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-white">{phone}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-8">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((data, index) => {
              return (
                <input
                  key={index}
                  type="text"
                  name="otp"
                  maxLength={1}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  value={data}
                  onChange={e => handleChange(e.target, index)}
                  onKeyDown={e => handleKeyDown(e, index)}
                  className="w-10 h-14 sm:w-12 sm:h-16 bg-slate-900/80 border border-slate-700 text-white rounded-lg text-center text-2xl font-bold focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-inner"
                />
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full btn-3d flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Verify & Login
                <ArrowRight className="ml-2 w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 flex flex-col items-center gap-4 text-sm">
          <button 
            onClick={handleResend}
            disabled={timeLeft > 0}
            className={`flex items-center gap-1 transition-colors ${timeLeft > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-orange-400 hover:text-orange-300'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${timeLeft > 0 ? '' : 'hover:animate-spin'}`} />
            {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend Code'}
          </button>
          
          <button 
            onClick={() => router.push('/login/engineer')}
            className="text-slate-500 hover:text-white transition-colors"
          >
            Change Phone Number
          </button>
        </div>
      </div>
    </div>
  );
}
