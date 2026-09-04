'use client';

import { useState, useEffect } from 'react';
import { Camera, Search, Filter, CheckCircle2, Clock, XCircle } from 'lucide-react';
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
        // Mock data
        setSubmissions([
          {
            id: '1',
            userId: 'u1',
            projectId: 'p1',
            mediaType: 'photo',
            mediaUrl: 'https://images.unsplash.com/photo-1541888087616-56af7b4f51fa?q=80&w=300&auto=format&fit=crop',
            gps: { type: 'Point', coordinates: [94.92, 27.47] },
            qrCodeValue: null,
            transcribedText: null,
            extractedEntities: { activity: 'Foundation', location: 'Sec 1', quantity: '', status: 'progress' },
            cvClassification: null,
            matchedActivityId: 'a1',
            confidenceScore: 0.95,
            status: 'approved',
            rejectionReason: null,
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            userId: 'u1',
            projectId: 'p1',
            mediaType: 'photo',
            mediaUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=300&auto=format&fit=crop',
            gps: { type: 'Point', coordinates: [94.92, 27.47] },
            qrCodeValue: null,
            transcribedText: null,
            extractedEntities: null,
            cvClassification: null,
            matchedActivityId: null,
            confidenceScore: 0.5,
            status: 'pending_review',
            rejectionReason: null,
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'all') return true;
    if (filter === 'pending') return sub.status === 'pending_review' || sub.status === 'processing';
    return sub.status === filter;
  });

  return (
    <div className="p-4 space-y-6 animate-in">
      {/* Header section */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Submissions</h1>
          <p className="text-slate-400 text-sm">Your recent captures and status.</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search captures..." 
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none"
          />
        </div>
        <button className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors">
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
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
          filteredSubmissions.map((sub) => (
            <div key={sub.id} className="glass-card flex gap-4 p-3 hover:border-slate-600 transition-colors cursor-pointer group">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative">
                {sub.mediaUrl ? (
                  <img src={sub.mediaUrl} alt="Capture" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-600" />
                  </div>
                )}
                
                {/* Status Indicator overlay */}
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                  {sub.status === 'approved' || sub.status === 'auto_approved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : sub.status === 'rejected' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-white text-sm truncate">
                    {sub.extractedEntities?.activity || 'Unknown Activity'}
                  </h3>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 mb-2 truncate">
                  AI Match: {sub.cvClassification?.label || 'Processing...'}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    sub.status === 'approved' || sub.status === 'auto_approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    sub.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {sub.status.replace('_', ' ')}
                  </span>
                  
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {sub.id.slice(0,6)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
