'use client';

import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { useCaptureStore } from '@/store/captureStore';
import { MapPin, Clock, CheckCircle2, AlertTriangle, CloudOff, CalendarDays } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Capture, ScheduleActivity } from '@/types/api';
import { listActivities } from '@/lib/api/dashboard';
import { listCaptures } from '@/lib/api/captures';
import { getUserProjectIds } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';

const ActivityMap = dynamic(() => import('@/components/schedule/ActivityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-bg-muted animate-pulse rounded-2xl border border-border flex items-center justify-center text-text-muted">
      Loading Map...
    </div>
  ),
});

export default function EngineerDashboard() {
  const { user } = useAuthStore();
  const { pendingCount, isOffline } = useCaptureStore();
  const [activities, setActivities] = useState<ScheduleActivity[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectId = getUserProjectIds(user)[0];
        const [activityRes, captureRes] = await Promise.all([
          projectId ? listActivities(projectId) : Promise.resolve({ items: [] as ScheduleActivity[] }),
          listCaptures({ limit: 50 }),
        ]);
        setActivities(activityRes.items || []);
        setCaptures(captureRes.items || []);
      } catch (error) {
        console.error('Failed to load engineer dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const approvedCount = captures.filter((c) => c.status === 'approved' || c.status === 'auto_approved').length;
  const pendingReviewCount = captures.filter((c) => c.status === 'pending_review' || c.status === 'processing').length;

  return (
    <div className="p-4 space-y-6 animate-in">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Hello, {user?.name?.split(' ')[0] || 'Engineer'}</h1>
          <p className="text-text-secondary text-sm">Here is your daily brief.</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/40 border-2 border-brand-200 dark:border-brand-700 flex items-center justify-center overflow-hidden">
          <span className="text-brand-700 dark:text-brand-400 font-bold">{user?.name?.charAt(0) || 'E'}</span>
        </div>
      </div>

      {(isOffline || pendingCount > 0) && (
        <div className="card bg-warning-bg border-warning/20 p-4 flex items-start gap-3">
          <div className="p-2 bg-warning/10 rounded-lg text-warning mt-0.5">
            <CloudOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-warning font-semibold text-sm">
              {isOffline ? 'You are offline' : `${pendingCount} Captures Pending Sync`}
            </h3>
            <p className="text-text-secondary text-xs mt-1">
              {isOffline
                ? 'Captures will be saved locally and synced when you reconnect.'
                : 'Waiting for network to sync your recent captures to HQ.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Approved</span>
          </div>
          <span className="text-3xl font-bold text-text-primary">{loading ? '—' : approvedCount}</span>
          <span className="text-text-muted text-xs mt-1">Your submissions</span>
        </div>
        <div className="card p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-warning">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <span className="text-3xl font-bold text-text-primary">{loading ? '—' : pendingReviewCount}</span>
          <span className="text-text-muted text-xs mt-1">In review queue</span>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            Nearby Activities
          </h2>
        </div>
        <div className="w-full h-64 rounded-2xl overflow-hidden card p-1">
          <ActivityMap activities={activities} />
        </div>
      </section>

      <section className="space-y-3 pb-4">
        <h2 className="text-lg font-bold text-text-primary">Today&apos;s Schedule</h2>
        <div className="space-y-3">
          {!loading && activities.length === 0 && (
            <EmptyState icon={CalendarDays} title="No activities yet" description="Your project schedule will appear here once it is published." />
          )}
          {activities.map((activity) => (
            <div key={activity.id} className="card p-4">
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-mono text-text-muted mb-1 block">{activity.activityCode}</span>
                  <h3 className="font-semibold text-text-primary text-base break-words">{activity.activityName}</h3>
                </div>
                {activity.status === 'delayed' && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-danger bg-danger-bg px-2 py-1 rounded shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    Delayed
                  </span>
                )}
                {activity.status === 'in_progress' && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-warning bg-warning-bg px-2 py-1 rounded shrink-0">
                    In Progress
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${activity.status === 'delayed' ? 'bg-danger' : 'bg-brand-500'}`}
                    style={{ width: `${activity.percentComplete}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-text-secondary">{activity.percentComplete}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
