'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, HelpCircle, HardHat, Phone, Mail, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="p-4 space-y-6 animate-in">
      <div className="flex items-center justify-between pt-4">
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
      </div>

      {/* User Info Card */}
      <div className="glass-card p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-orange-600/40 to-orange-400/10" />
        
        <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-900 shadow-xl flex items-center justify-center relative z-10 mb-4">
          <span className="text-4xl text-orange-400 font-bold">{user?.name?.charAt(0) || 'E'}</span>
        </div>
        
        <h2 className="text-xl font-bold text-text-primary">{user?.name || 'Site Engineer'}</h2>
        <p className="text-sm text-orange-400 font-medium mb-4 flex items-center gap-1">
          <HardHat className="w-4 h-4" />
          Field Operator
        </p>
        
        <div className="w-full space-y-3 mt-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <Phone className="w-5 h-5 text-slate-400" />
            <span className="text-text-secondary text-sm">{user?.phone || 'No phone on file'}</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <Mail className="w-5 h-5 text-slate-400" />
            <span className="text-text-secondary text-sm">{user?.email || 'No email on file'}</span>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="glass-card overflow-hidden">
        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="text-text-primary text-sm font-medium">App Settings</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-slate-400" />
            <span className="text-text-primary text-sm font-medium">Help & Support</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-red-400"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </div>
        </button>
      </div>
      
      <div className="text-center text-xs text-slate-600 pb-4">
        <p>FieldPulse AI v1.0.0</p>
        <p>Oil India Limited © 2026</p>
      </div>
    </div>
  );
}
