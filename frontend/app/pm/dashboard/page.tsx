'use client';

import { Activity, AlertTriangle, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getProjectDashboard, listAlerts } from '@/lib/api/dashboard';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { socket } from '@/lib/socket';

export default function PMDashboard() {
  const { selectedProjectId } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedProjectId) return;
    
    socket.connect(selectedProjectId);
    
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['projectDashboard', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['projectAlerts', selectedProjectId] });
    };

    socket.on('activity_updated', handleUpdate);
    socket.on('new_review_item', handleUpdate);
    socket.on('poll', handleUpdate); // from fallback

    return () => {
      socket.off('activity_updated', handleUpdate);
      socket.off('new_review_item', handleUpdate);
      socket.off('poll', handleUpdate);
      socket.disconnect();
    };
  }, [selectedProjectId, queryClient]);

  const { data: dashboardData, isLoading: isLoadingDashboard, isError: isErrorDashboard } = useQuery({
    queryKey: ['projectDashboard', selectedProjectId],
    queryFn: () => getProjectDashboard(selectedProjectId!),
    enabled: !!selectedProjectId,
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: alertsData } = useQuery({
    queryKey: ['projectAlerts', selectedProjectId],
    queryFn: () => listAlerts(selectedProjectId!),
    enabled: !!selectedProjectId,
    refetchInterval: 30000,
  });

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-bold text-text-primary">No Project Selected</h2>
        <p className="text-text-secondary mt-2">Please select a project from the sidebar to view the dashboard.</p>
      </div>
    );
  }

  if (isLoadingDashboard) {
    return <div className="h-full flex items-center justify-center"><LoadingSpinner size={40} /></div>;
  }

  if (isErrorDashboard || !dashboardData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-xl font-bold text-text-primary">Failed to load dashboard</h2>
        <p className="text-text-secondary mt-2">Could not retrieve metrics for this project. Please try again later.</p>
      </div>
    );
  }

  const alerts = alertsData?.items || [];

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Project Overview" 
        subtitle={`Monitoring ${dashboardData.projectName}`}
        badge={{ label: dashboardData.status.replace('_', ' ').toUpperCase(), color: dashboardData.status === 'on_track' ? 'success' : dashboardData.status === 'at_risk' ? 'warning' : 'danger' }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: 'Overall Progress', value: `${dashboardData.overallPercentComplete}%`, icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50' },
          { title: 'Total Activities', value: dashboardData.totalActivities.toString(), icon: CheckSquare, color: 'text-success', bg: 'bg-success-bg' },
          { title: 'Delayed Activities', value: dashboardData.delayedActivities.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Completed Activities', value: dashboardData.completedActivities.toString(), icon: Activity, color: 'text-brand-500', bg: 'bg-brand-50' },
        ].map((kpi, i) => (
          <div key={i} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-text-primary">{kpi.value}</span>
            </div>
            <h3 className="text-text-secondary font-semibold">{kpi.title}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="xl:col-span-2 card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">Progress S-Curve</h2>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            {dashboardData.sCurve && dashboardData.sCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.sCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: '500' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="planned_percent" name="Planned %" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" />
                  <Area type="monotone" dataKey="actual_percent" name="Actual %" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-text-muted">
                No curve data available. Start adding activities.
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts & Activity */}
        <div className="card p-6 flex flex-col">
          <h2 className="text-lg font-bold text-text-primary mb-6">Recent Alerts</h2>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="text-sm text-text-muted text-center mt-4">No recent alerts.</div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="flex gap-4 p-3 rounded-xl hover:bg-bg-muted transition-colors border border-transparent hover:border-border cursor-pointer">
                  <div className="mt-1 flex-shrink-0">
                    {alert.type === 'delay' ? <AlertTriangle className="w-5 h-5 text-danger" /> :
                     alert.type === 'critical_path' ? <Activity className="w-5 h-5 text-warning" /> :
                     <CheckSquare className="w-5 h-5 text-success" />}
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold mb-1 ${
                      alert.type === 'delay' ? 'text-danger' :
                      alert.type === 'critical_path' ? 'text-warning' : 'text-text-primary'
                    }`}>{alert.type.replace('_', ' ').toUpperCase()}</h4>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{alert.message}</p>
                    <span className="text-[10px] text-text-muted mt-2 block font-medium">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
