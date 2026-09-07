'use client';

import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { useCaptureStore } from '@/store/captureStore';
import { MapPin, Clock, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ScheduleActivity } from '@/types/api';
import { listActivities } from '@/lib/api/dashboard';

// Dynamically import map component with SSR disabled
const ActivityMap = dynamic(() => import('@/components/schedule/ActivityMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-slate-900 animate-pulse rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500">Loading Map...</div>
});

export default function EngineerDashboard() {
  const { user } = useAuthStore();
  const { pendingCount, isOffline } = useCaptureStore();
  const [activities, setActivities] = useState<ScheduleActivity[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const projectId = user?.project_ids?.[0];
        if (projectId) {
          const res = await listActivities(projectId);
          setActivities(res.items || []);
        }
      } catch (error) {
        console.error("Failed to load activities", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [user]);

  return (
    <div className="p-4 space-y-6 animate-in">
      {/* Header section */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Hello, {user?.name?.split(' ')[0] || 'Engineer'}</h1>
          <p className="text-slate-400 text-sm">Here is your daily brief.</p>
        </div>
        
        {/* Avatar / Profile quick link */}
        <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-orange-500/50 flex items-center justify-center overflow-hidden">
          <span className="text-orange-400 font-bold">{user?.name?.charAt(0) || 'E'}</span>
        </div>
      </div>

      {/* Offline/Sync Banner */}
      {(isOffline || pendingCount > 0) && (
        <div className="glass-card bg-orange-500/10 border-orange-500/20 p-4 flex items-start gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 mt-0.5">
            <CloudOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-orange-400 font-semibold text-sm">
              {isOffline ? 'You are offline' : `${pendingCount} Captures Pending Sync`}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {isOffline 
                ? 'Captures will be saved locally and synced when you reconnect.'
                : 'Waiting for network to sync your recent captures to HQ.'}
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Approved</span>
          </div>
          <span className="text-3xl font-bold text-white">12</span>
          <span className="text-slate-500 text-xs mt-1">This week</span>
        </div>
        <div className="glass-card p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <span className="text-3xl font-bold text-white">4</span>
          <span className="text-slate-500 text-xs mt-1">In review queue</span>
        </div>
      </div>

      {/* Map Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-400" />
            Nearby Activities
          </h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-md">Within 5km</span>
        </div>
        
        <div className="w-full h-64 rounded-2xl overflow-hidden glass-card p-1">
          <ActivityMap activities={activities} />
        </div>
      </section>

      {/* Today's Tasks */}
      <section className="space-y-3 pb-4">
        <h2 className="text-lg font-bold text-white">Today's Schedule</h2>
        
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="glass-card p-4 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-mono text-slate-500 mb-1 block">{activity.activityCode}</span>
                  <h3 className="font-semibold text-white text-base">{activity.activityName}</h3>
                </div>
                {activity.status === 'delayed' && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    Delayed
                  </span>
                )}
                {activity.status === 'in_progress' && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                    In Progress
                  </span>
                )}
              </div>
              
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${activity.status === 'delayed' ? 'bg-red-500' : 'bg-orange-500'}`}
                    style={{ width: `${activity.percentComplete}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-300">{activity.percentComplete}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
