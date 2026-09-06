'use client';

import { CalendarDays, Filter, Search, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { listActivities } from '@/lib/api/dashboard';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const ActivityMap = dynamic(() => import('@/components/schedule/ActivityMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-bg-muted animate-pulse rounded-2xl flex items-center justify-center text-text-muted font-semibold border border-border">Loading Map...</div>
});

export default function PMSchedule() {
  const { selectedProjectId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: scheduleData, isLoading, isError } = useQuery({
    queryKey: ['scheduleActivities', selectedProjectId],
    queryFn: () => listActivities(selectedProjectId!),
    enabled: !!selectedProjectId,
    refetchInterval: 30000,
  });

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-bold text-text-primary">No Project Selected</h2>
        <p className="text-text-secondary mt-2">Please select a project from the sidebar to view the schedule.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><LoadingSpinner size={40} /></div>;
  }

  if (isError || !scheduleData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-xl font-bold text-text-primary">Failed to load schedule</h2>
        <p className="text-text-secondary mt-2">Could not retrieve activities for this project.</p>
      </div>
    );
  }

  const activities = scheduleData.items || [];
  
  const filteredActivities = activities.filter(act => 
    act.activityCode?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    act.activityName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <PageHeader 
          title="Schedule & Map" 
          subtitle="Interactive view of all activities."
          badge={{ label: 'Live Data', color: 'brand' }}
        />
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search code or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-border rounded-xl text-text-muted hover:text-text-primary transition-colors shadow-sm hover:border-border-strong">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Activity List (Gantt-lite) */}
        <div className="w-full lg:w-1/3 flex flex-col min-h-0">
          <div className="card flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center text-text-muted mt-8">No activities found.</div>
            ) : (
              filteredActivities.map((act) => (
                <div key={act.id} className="p-3 bg-white border border-border rounded-xl hover:border-brand-500 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-text-secondary bg-bg-muted px-1.5 py-0.5 rounded border border-border">
                      {act.activityCode}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      act.status === 'delayed' ? 'bg-danger-bg text-danger border border-danger/20' :
                      act.status === 'in_progress' ? 'bg-warning-bg text-warning border border-warning/20' :
                      'bg-success-bg text-success border border-success/20'
                    }`}>
                      {act.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-text-primary text-sm mb-3 group-hover:text-brand-600 transition-colors">
                    {act.activityName}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-bg-muted rounded-full overflow-hidden border border-border">
                      <div 
                        className={`h-full rounded-full ${act.status === 'delayed' ? 'bg-danger' : 'bg-brand-500'}`}
                        style={{ width: `${act.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-text-secondary w-8">{act.percentComplete}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map View */}
        <div className="w-full lg:w-2/3 card rounded-2xl overflow-hidden min-h-[300px] lg:min-h-0 relative z-0 p-0 border-border">
          <ActivityMap activities={activities} />
          <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-border flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary"><span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600"></span> Planned</div>
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary"><span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></span> In Progress</div>
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary"><span className="w-3 h-3 rounded-full bg-red-500 border border-red-600"></span> Delayed</div>
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary"><span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></span> Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
