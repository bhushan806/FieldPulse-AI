'use client';

import { useRouter } from 'next/navigation';
import { Globe, AlertTriangle, Filter, Search, CheckCircle2, Clock, FolderPlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

const PortfolioMap = dynamic(() => import('@/components/hq/PortfolioMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl flex items-center justify-center text-text-muted font-semibold border border-border">Loading Map...</div>
});

export default function PortfolioDashboard() {
  const router = useRouter();
  const { data, isLoading: loading } = useQuery({
    queryKey: ['portfolioDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/dashboard/portfolio');
      return res.data;
    },
    refetchInterval: 30000,
  });

  if (loading) return (
    <div className="w-full h-[500px] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const projects = data?.projects?.map((p: any) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    percent: p.percentComplete || 0,
    pm: 'Assigned PM',
    lastUpdate: 'Recently',
    lat: p.location?.coordinates?.[1] || 27.47,
    lng: p.location?.coordinates?.[0] || 94.92
  })) || [];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader 
          title="Portfolio Overview" 
          subtitle="Monitoring all active infrastructure projects."
        />
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/hq/projects/new')}
            className="btn-outline border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
          >
            <FolderPlus className="w-4 h-4" />
            Create Project
          </button>
          <button className="btn-primary">
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Total Projects" value={data?.total_projects || 0} icon={Globe} />
        <MetricCard title="On Track" value={data?.on_track || 0} icon={CheckCircle2} />
        <MetricCard title="At Risk" value={data?.at_risk || 0} icon={AlertTriangle} />
        <MetricCard title="Delayed" value={data?.delayed || 0} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="xl:col-span-2 card p-6 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">Active Projects</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" placeholder="Search..." className="bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm font-medium" />
              </div>
              <button className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary shadow-sm hover:border-neutral-400 dark:hover:border-neutral-500">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted text-sm">
                  <th className="pb-3 font-semibold">Project Name</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Progress</th>
                  <th className="pb-3 font-semibold">PM</th>
                  <th className="pb-3 font-semibold">Last Update</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {projects.map((proj: any) => (
                  <tr key={proj.id} className="border-b border-border hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group cursor-pointer" onClick={() => router.push(`/hq/projects/${proj.id}/setup`)}>
                    <td className="py-4 font-bold text-text-primary">{proj.name}</td>
                    <td className="py-4">
                      <StatusPill status={proj.status} />
                    </td>
                    <td className="py-4 w-40">
                      <ProgressBar 
                        progress={proj.percent} 
                        indicatorClassName={proj.status === 'delayed' ? 'bg-danger' : proj.status === 'at_risk' ? 'bg-warning' : 'bg-success'} 
                      />
                    </td>
                    <td className="py-4 text-text-secondary font-medium">{proj.pm}</td>
                    <td className="py-4 text-text-muted text-xs font-semibold">{proj.lastUpdate}</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/hq/projects/${proj.id}/setup`); }}
                        className="text-brand-600 hover:text-brand-700 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/20 dark:text-brand-400"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Map View */}
        <div className="card flex flex-col p-2">
          <div className="h-full w-full rounded-xl overflow-hidden relative z-0 min-h-[300px] border border-border">
            <PortfolioMap projects={projects} />
          </div>
        </div>
      </div>
    </div>
  );
}
