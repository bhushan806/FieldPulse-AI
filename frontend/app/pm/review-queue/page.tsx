'use client';

import { useState, useEffect } from 'react';
import { Check, X, Filter, ChevronRight, AlertCircle, Camera, CheckSquare } from 'lucide-react';
import { ReviewQueueItem } from '@/types/api';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useUIStore } from '@/store/uiStore';
import { PageHeader } from '@/components/shared/PageHeader';

export default function ReviewQueue() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [overridePercent, setOverridePercent] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const { addNotification } = useUIStore();

  useEffect(() => {
    // Mock fetch
    const fetchQueue = async () => {
      try {
        // const res = await apiClient.get(API_ENDPOINTS.review.queue);
        // setItems(res.data.items);
        
        // Mock data
        setItems([
          {
            id: 'cap_123',
            userId: 'eng_1',
            projectId: 'p1',
            mediaType: 'photo',
            mediaUrl: 'https://images.unsplash.com/photo-1541888087616-56af7b4f51fa?q=80&w=600&auto=format&fit=crop',
            gps: { type: 'Point', coordinates: [94.92, 27.47] },
            qrCodeValue: null,
            transcribedText: 'Started pouring the foundation for section B.',
            extractedEntities: { activity: 'Foundation', location: 'Section B', quantity: '', status: 'Started' },
            cvClassification: { label: 'Concrete Pouring', confidence: 0.65 }, // Low confidence
            matchedActivityId: 'act_456',
            confidenceScore: 0.65,
            status: 'pending_review',
            rejectionReason: null,
            createdAt: new Date().toISOString(),
            submittedBy: { id: 'eng_1', name: 'Rahul Sharma' },
            suggestedActivity: { id: 'act_456', activityCode: 'FND-02', activityName: 'Section B Foundation' }
          }
        ]);
      } catch (error) {
        addNotification({ type: 'error', message: 'Failed to load review queue.' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQueue();
  }, [addNotification]);

  const handleApprove = async () => {
    if (!selectedItem) return;
    try {
      // await apiClient.post(API_ENDPOINTS.review.approve(selectedItem.id), {
      //   matchedActivityId: selectedItem.matchedActivityId,
      //   percentCompleteOverride: overridePercent ? parseInt(overridePercent) : null
      // });
      
      addNotification({ type: 'success', message: 'Capture approved successfully.' });
      setItems(items.filter(i => i.id !== selectedItem.id));
      setSelectedItem(null);
      setOverridePercent('');
    } catch (error) {
      addNotification({ type: 'error', message: 'Approval failed.' });
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !rejectionReason) return;
    try {
      // await apiClient.post(API_ENDPOINTS.review.reject(selectedItem.id), { reason: rejectionReason });
      
      addNotification({ type: 'info', message: 'Capture rejected and sent back.' });
      setItems(items.filter(i => i.id !== selectedItem.id));
      setSelectedItem(null);
      setRejectionReason('');
    } catch (error) {
      addNotification({ type: 'error', message: 'Rejection failed.' });
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={40} /></div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in flex-col lg:flex-row">
      {/* Queue List */}
      <div className={`w-full lg:w-1/3 flex flex-col h-full ${selectedItem ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brand-600" />
            Review Queue
            <span className="bg-brand-50 text-brand-600 text-xs px-2 py-0.5 rounded-full ml-2 border border-brand-100 font-semibold">
              {items.length}
            </span>
          </h1>
          <button className="p-2 text-text-muted hover:text-text-primary transition-colors bg-white border border-border rounded-lg shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted bg-white/50 border border-border border-dashed rounded-2xl">
              <CheckSquare className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium text-text-secondary">Queue is empty. Great job!</p>
            </div>
          ) : (
            items.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`card p-4 cursor-pointer transition-all ${
                  selectedItem?.id === item.id 
                    ? 'border-brand-500 bg-brand-50 shadow-md ring-1 ring-brand-500' 
                    : 'hover:border-border-strong hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-semibold text-text-secondary bg-bg-muted px-2 py-0.5 rounded border border-border">
                    ID: {item.id.slice(0,6)}
                  </span>
                  <span className="text-[10px] text-text-muted font-medium">
                    {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                
                <h3 className="font-bold text-text-primary text-sm line-clamp-1 mb-1">
                  {item.suggestedActivity?.activityName || 'Unmatched Activity'}
                </h3>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                    <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">
                      {item.submittedBy.name.charAt(0)}
                    </div>
                    {item.submittedBy.name}
                  </div>
                  
                  {item.confidenceScore < 0.7 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-warning bg-warning-bg border border-warning/20 px-2 py-0.5 rounded">
                      <AlertCircle className="w-3 h-3" />
                      Low Confidence ({Math.round(item.confidenceScore * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Details Pane */}
      <div className={`w-full lg:w-2/3 card flex flex-col overflow-hidden h-full ${!selectedItem ? 'hidden lg:flex items-center justify-center text-text-muted' : 'flex'}`}>
        {!selectedItem ? (
          <div className="text-center bg-bg-muted/50 w-full h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white border border-border rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <CheckSquare className="w-10 h-10 text-border-strong" />
            </div>
            <p className="font-semibold text-text-secondary">Select an item from the queue to review.</p>
          </div>
        ) : (
          <>
            {/* Mobile Header Back Button */}
            <div className="lg:hidden p-4 border-b border-border bg-surface flex items-center gap-2 shadow-sm z-10">
              <button onClick={() => setSelectedItem(null)} className="text-brand-600 flex items-center text-sm font-semibold hover:text-brand-700">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Queue
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col xl:flex-row gap-6">
              {/* Media Section */}
              <div className="w-full xl:w-1/2 space-y-4">
                <div className="rounded-xl overflow-hidden bg-bg-muted border border-border aspect-video relative group shadow-sm">
                  <img src={selectedItem.mediaUrl} alt="Capture" className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-text-primary text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm border border-white/20">
                    <Camera className="w-3.5 h-3.5" /> Photo
                  </div>
                </div>
                
                <div className="bg-bg-muted rounded-xl p-4 border border-border">
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Engineer's Notes</h4>
                  <p className="text-sm text-text-primary italic font-medium leading-relaxed">
                    "{selectedItem.transcribedText || 'No notes provided.'}"
                  </p>
                </div>

                <div className="bg-bg-muted rounded-xl p-4 border border-border space-y-3">
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">AI Extraction</h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                    <div><span className="text-text-muted block text-xs font-medium mb-0.5">Activity</span><span className="text-text-primary font-semibold">{selectedItem.extractedEntities?.activity || '-'}</span></div>
                    <div><span className="text-text-muted block text-xs font-medium mb-0.5">Location</span><span className="text-text-primary font-semibold">{selectedItem.extractedEntities?.location || '-'}</span></div>
                    <div><span className="text-text-muted block text-xs font-medium mb-0.5">Visual Match</span><span className="text-brand-600 font-semibold bg-brand-50 px-1.5 py-0.5 rounded">{selectedItem.cvClassification?.label || '-'}</span></div>
                    <div><span className="text-text-muted block text-xs font-medium mb-0.5">Confidence</span><span className="text-warning font-semibold bg-warning-bg px-1.5 py-0.5 rounded">{Math.round(selectedItem.confidenceScore * 100)}%</span></div>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="w-full xl:w-1/2 flex flex-col h-full">
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                      <Check className="w-4 h-4 text-brand-600" />
                      AI Suggested Match
                    </h3>
                    {selectedItem.suggestedActivity ? (
                      <div className="p-4 rounded-xl border border-brand-200 bg-brand-50 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-brand-700 text-sm font-bold bg-white px-2 py-0.5 rounded-md border border-brand-100">{selectedItem.suggestedActivity.activityCode}</span>
                          <button className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors">Change Match</button>
                        </div>
                        <p className="font-bold text-text-primary text-base">{selectedItem.suggestedActivity.activityName}</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-danger/30 bg-danger-bg text-danger text-sm font-semibold shadow-sm">
                        No scheduled activity matched. Please select manually.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-bold text-text-primary block mb-2">Override % Complete (Optional)</label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0" max="100"
                          value={overridePercent}
                          onChange={(e) => setOverridePercent(e.target.value)}
                          placeholder="e.g. 75"
                          className="bg-white border border-border rounded-lg pl-4 pr-8 py-2.5 text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none w-32 font-medium shadow-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-text-primary block mb-2">Rejection Reason (If rejecting)</label>
                    <textarea 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Image too blurry, please retake."
                      className="w-full bg-white border border-border rounded-lg px-4 py-3 text-text-primary focus:border-danger focus:ring-1 focus:ring-danger outline-none resize-none h-24 font-medium shadow-sm placeholder-text-muted/50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6 mt-6 border-t border-border">
                  <button 
                    onClick={handleReject}
                    disabled={!rejectionReason}
                    className="flex-1 py-3 rounded-xl border-2 border-danger/20 text-danger font-bold hover:bg-danger-bg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  >
                    <X className="w-5 h-5" />
                    Reject
                  </button>
                  <button 
                    onClick={handleApprove}
                    className="flex-[2] btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-base shadow-sm"
                  >
                    <Check className="w-5 h-5" />
                    Approve Match
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
