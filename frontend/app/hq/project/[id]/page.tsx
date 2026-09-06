'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, CheckCircle2, AlertTriangle, Clock, CalendarDays, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { getProjectDashboard } from '@/lib/api/dashboard';
import { DashboardMetrics } from '@/types/api';
import { useUIStore } from '@/store/uiStore';

export default function ProjectDrillDown({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { addNotification } = useUIStore();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getProjectDashboard(params.id);
        setMetrics(data);
      } catch (err: any) {
        addNotification({ type: 'error', message: err.message || 'Failed to load project dashboard.' });
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [params.id, addNotification]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={40} /></div>;
  if (!metrics) return <div className="h-full flex items-center justify-center text-slate-400 font-medium">Dashboard not found.</div>;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 transition-colors border border-slate-700/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{metrics.projectName}</h1>
            <span className={`border text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              metrics.status === 'delayed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              metrics.status === 'at_risk' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {metrics.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-slate-400 text-sm flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Global View</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-6">Progress S-Curve</h2>
            <div className="h-[300px] w-full">
              {metrics.sCurve && metrics.sCurve.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.sCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="plannedPercent" name="Planned %" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" />
                    <Area type="monotone" dataKey="actualPercent" name="Actual %" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                  Not enough data for S-Curve
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Project Overview</h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Overall Progress</span>
                <p className="text-xl font-medium text-white">{metrics.overallPercentComplete.toFixed(1)}%</p>
              </div>
              <div className="w-full h-px bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Total Activities</span>
                <p className="text-sm text-white font-medium">{metrics.totalActivities} ({metrics.completedActivities} Completed)</p>
              </div>
              <div className="w-full h-px bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Delayed Activities</span>
                <p className="text-sm text-red-400 font-bold">{metrics.delayedActivities}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
