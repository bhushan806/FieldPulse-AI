'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, CheckCircle2, AlertTriangle, Clock, CalendarDays, MapPin } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { getProjectDashboard, getProjectForecast } from '@/lib/api/dashboard';
import { DashboardMetrics } from '@/types/api';
import { useUIStore } from '@/store/uiStore';
import { socket } from '@/lib/socket';
import { StatusPill } from '@/components/shared/StatusPill';

export default function ProjectDrillDown({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const { addNotification } = useUIStore();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [dashboardData, forecastData] = await Promise.all([
          getProjectDashboard(params.id),
          getProjectForecast(params.id).catch(() => null)
        ]);
        
        setMetrics(dashboardData);
        
        let merged: any[] = dashboardData.sCurve ? [...dashboardData.sCurve] : [];
        if (forecastData && forecastData.forecast) {
          const forecastMap = new Map(forecastData.forecast.map((f: any) => [f.date, f.forecastPercent]));
          
          merged = merged.map(d => ({
            ...d,
            forecastPercent: forecastMap.get(d.date)
          }));
          
          const existingDates = new Set(merged.map(d => d.date));
          for (const f of forecastData.forecast) {
            if (!existingDates.has(f.date)) {
              merged.push({
                date: f.date,
                plannedPercent: undefined,
                actualPercent: undefined,
                forecastPercent: f.forecastPercent
              });
            }
          }
          merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        setChartData(merged);
      } catch (err: any) {
        addNotification({ type: 'error', message: err.message || 'Failed to load project dashboard.' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();

    // Connect to websocket for real-time updates
    socket.connect(params.id);
    const handleUpdate = () => {
      fetchMetrics();
    };

    socket.on('activity_updated', handleUpdate);
    socket.on('new_review_item', handleUpdate);
    socket.on('poll', handleUpdate);

    return () => {
      socket.off('activity_updated', handleUpdate);
      socket.off('new_review_item', handleUpdate);
      socket.off('poll', handleUpdate);
      socket.disconnect();
    };
  }, [params.id, addNotification]);

  if (loading) return <div className="h-[500px] flex items-center justify-center"><LoadingSpinner size={40} /></div>;
  if (!metrics) return <div className="h-[500px] flex items-center justify-center text-text-muted font-medium">Dashboard not found.</div>;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary hover:border-neutral-400 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{metrics.projectName}</h1>
            <StatusPill status={metrics.status} />
          </div>
          <p className="text-text-secondary text-sm flex items-center gap-4 mt-1 font-medium">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-text-muted" /> Global View</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-text-primary mb-6">Progress S-Curve</h2>
            <div className="h-[300px] w-full">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="date" stroke="currentColor" strokeOpacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="currentColor" strokeOpacity={0.5} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: 'var(--text-secondary)' }} />
                    <Area type="monotone" dataKey="plannedPercent" name="Planned %" stroke="#94A3B8" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" connectNulls />
                    <Area type="monotone" dataKey="actualPercent" name="Actual %" stroke="#0D9488" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" connectNulls />
                    <Area type="monotone" dataKey="forecastPercent" name="AI Forecast %" stroke="#D97706" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-text-muted text-sm font-semibold">
                  Not enough data for S-Curve
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 h-full flex flex-col">
            <h2 className="text-lg font-bold text-text-primary mb-6">Project Overview</h2>
            <div className="space-y-5 flex-1">
              <div>
                <span className="text-xs text-text-muted uppercase tracking-wider font-bold block mb-1.5">Overall Progress</span>
                <p className="text-3xl font-black text-text-primary tabular-nums">{metrics.overallPercentComplete.toFixed(1)}%</p>
              </div>
              <div className="w-full h-px bg-border" />
              <div>
                <span className="text-xs text-text-muted uppercase tracking-wider font-bold block mb-1.5">Total Activities</span>
                <p className="text-lg font-semibold text-text-primary tabular-nums">
                  {metrics.totalActivities} 
                  <span className="text-sm font-medium text-text-secondary ml-2">({metrics.completedActivities} Completed)</span>
                </p>
              </div>
              <div className="w-full h-px bg-border" />
              <div>
                <span className="text-xs text-text-muted uppercase tracking-wider font-bold block mb-1.5">Delayed Activities</span>
                <p className="text-lg font-bold text-danger tabular-nums">{metrics.delayedActivities}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
