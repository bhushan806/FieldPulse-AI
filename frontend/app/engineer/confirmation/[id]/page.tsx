'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Home, Plus, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function ConfirmationPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const { data: captureData, isLoading, isError } = useQuery({
    queryKey: ['captureDetails', params.id],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.captures.details(params.id));
      return res.data;
    },
    refetchInterval: (query) => {
      // Poll every 3 seconds while processing
      return query.state.data?.status === 'processing' ? 3000 : false;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <LoadingSpinner size={48} />
        <p className="mt-4 text-slate-400">Processing capture with AI...</p>
      </div>
    );
  }

  if (isError || !captureData) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-danger mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Failed to Load</h1>
        <p className="text-slate-400 mb-8 max-w-sm">
          Could not fetch the capture details. It might have been deleted or there is a network issue.
        </p>
        <button 
          onClick={() => router.push('/engineer/home')}
          className="w-full py-4 rounded-xl bg-slate-800 text-white font-medium flex items-center justify-center gap-2 max-w-xs"
        >
          <Home className="w-5 h-5" />
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isProcessing = captureData.status === 'processing';
  const isFailed = captureData.status === 'processing_failed';

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
        isFailed ? 'bg-red-500/10 text-red-500' :
        isProcessing ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
      }`}>
        {isFailed ? <AlertTriangle className="w-12 h-12" /> :
         isProcessing ? <LoadingSpinner size={48} /> : <CheckCircle2 className="w-12 h-12" />}
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-2">
        {isFailed ? 'Processing Failed' : isProcessing ? 'Analyzing...' : 'Capture Analyzed'}
      </h1>
      <p className="text-slate-400 mb-8 max-w-sm">
        {isFailed ? 'The AI engine encountered an error while analyzing your submission. Please try again or submit manually.' :
         isProcessing ? 'Your progress update is being processed by FieldPulse AI.' :
         'Your progress update has been successfully analyzed.'}
      </p>

      {/* AI Processing Preview Card */}
      {!isFailed && (
        <div className="w-full max-w-sm glass-card p-6 mb-8 text-left space-y-4 relative overflow-hidden">
          {isProcessing && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />}
          
          <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
            {isProcessing ? (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
            AI Analysis
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
              <span className="text-slate-400 text-sm">Detected Activity</span>
              <span className="text-white font-medium">{captureData.extracted_entities?.activity || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
              <span className="text-slate-400 text-sm">Visual Match</span>
              <span className="text-white font-medium">{captureData.cv_classification?.label || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Status</span>
              <span className={`font-medium ${
                captureData.status === 'auto_approved' ? 'text-emerald-400' : 'text-orange-400'
              }`}>
                {captureData.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

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
