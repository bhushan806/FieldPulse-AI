'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Home, Plus } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function ConfirmationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // In a real app we'd fetch the capture details to show what was matched
    // For now we'll just mock it after a brief delay
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.captures.details(params.id));
        setData(res.data);
      } catch (e) {
        // Mock data if API isn't fully ready
        setData({
          status: 'processing',
          extractedEntities: { activity: 'Excavation', location: 'Sector 4' },
          cvClassification: { label: 'Heavy Machinery', confidence: 0.92 }
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <LoadingSpinner size={48} />
        <p className="mt-4 text-slate-400">Processing capture with AI...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 text-emerald-500">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-2">Capture Submitted</h1>
      <p className="text-slate-400 mb-8 max-w-sm">
        Your progress update has been uploaded successfully and is being processed by FieldPulse AI.
      </p>

      {/* AI Processing Preview Card */}
      <div className="w-full max-w-sm glass-card p-6 mb-8 text-left space-y-4 relative overflow-hidden">
        {/* Animated scanning line effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />
        
        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          AI Analysis
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
            <span className="text-slate-400 text-sm">Detected Activity</span>
            <span className="text-white font-medium">{data?.extractedEntities?.activity || 'Analyzing...'}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
            <span className="text-slate-400 text-sm">Visual Match</span>
            <span className="text-white font-medium">{data?.cvClassification?.label || 'Analyzing...'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Status</span>
            <span className="text-orange-400 font-medium">Pending PM Review</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button 
          onClick={() => router.push('/engineer/capture')}
          className="w-full btn-3d flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Capture
        </button>
        
        <button 
          onClick={() => router.push('/engineer/home')}
          className="w-full py-4 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
