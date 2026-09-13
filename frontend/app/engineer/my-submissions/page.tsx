'use client';

import { useState, useEffect } from 'react';
import { Camera, Search, Filter, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import { Capture } from '@/types/api';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.captures.mine);
        setSubmissions(res.data.items || []);
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter((sub) => {
    const status = String(sub.status);
    if (filter === 'all') return true;
    if (filter === 'pending') return status === 'pending_review' || status === 'processing';
    if (filter === 'approved') return status === 'approved' || status === 'auto_approved';
    return status === 'rejected';
  });

  return (
    <div className="p-4 space-y-6 animate-in">
      {/* Header section */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Submissions</h1>
          <p className="text-text-secondary text-sm">Your recent captures and status.</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search captures..." 
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-text-primary focus:border-brand-500 outline-none"
          />
        </div>
        <button className="p-3 bg-surface border border-border rounded-xl text-text-secondary hover:text-text-primary transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-colors ${
              filter === f 
                ? 'bg-brand-600 text-white' 
                : 'bg-bg-muted text-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4 pb-4">
        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No submissions found.</p>
          </div>
        ) : (
          filteredSubmissions.map((sub) => {
            const status = String(sub.status);
            const isApproved = status === 'approved' || status === 'auto_approved';
            const isRejected = status === 'rejected';
            return (
            <div key={sub.id} className="card flex gap-4 p-3 hover:border-border-strong transition-colors cursor-pointer group">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-bg-muted shrink-0 relative">
                {sub.mediaType === 'document' || sub.mediaUrl?.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/10 text-blue-500">
                    <FileText className="w-8 h-8 mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Document</span>
                  </div>
                ) : sub.mediaUrl ? (
                  <img src={sub.mediaUrl} alt="Capture" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-text-muted" />
                  </div>
                )}
                
                {/* Status Indicator overlay */}
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center">
                  {isApproved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : isRejected ? (
                    <XCircle className="w-3.5 h-3.5 text-danger" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-warning" />
                  )}
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-text-primary text-sm truncate">
                    {sub.extractedEntities?.activity || 'Unknown Activity'}
                  </h3>
                  <span className="text-[10px] text-text-muted whitespace-nowrap ml-2">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-xs text-text-secondary mb-2 truncate">
                  AI Match: {sub.cvClassification?.label || 'Processing...'}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    isApproved ? 'bg-success-bg text-success' :
                    isRejected ? 'bg-danger-bg text-danger' :
                    'bg-warning-bg text-warning'
                  }`}>
                    {status.replace('_', ' ')}
                  </span>
                  
                  <span className="text-[10px] font-mono text-text-muted">
                    ID: {sub.id.slice(0,6)}
                  </span>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
