'use client';

import { useRouter } from 'next/navigation';
import { Globe, AlertTriangle, TrendingUp, Filter, Search, MoreVertical, CheckCircle2, Clock } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';

const PortfolioMap = dynamic(() => import('@/components/hq/PortfolioMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-bg-muted animate-pulse rounded-2xl flex items-center justify-center text-text-muted font-semibold border border-border">Loading Map...</div>
});

import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

export default function PortfolioDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/dashboard/portfolio')
      .then(res => {
        setData(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
          <button className="btn-primary px-5 py-2.5 text-sm shadow-sm font-semibold">
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: 'Total Projects', value: data?.total_projects || 0, icon: Globe, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200' },
          { title: 'On Track', value: data?.on_track || 0, icon: CheckCircle2, color: 'text-success', bg: 'bg-success-bg', border: 'border-success/20' },
          { title: 'At Risk', value: data?.at_risk || 0, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-bg', border: 'border-warning/20' },
          { title: 'Delayed', value: data?.delayed || 0, icon: Clock, color: 'text-danger', bg: 'bg-danger-bg', border: 'border-danger/20' },
        ].map((kpi, i) => (
          <div key={i} className={`card p-5 border shadow-sm ${kpi.border} hover:shadow-md transition-shadow cursor-pointer`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border shadow-sm ${kpi.bg} ${kpi.border} ${kpi.color}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className="text-3xl font-bold text-text-primary">{kpi.value}</span>
            </div>
            <h3 className="text-text-secondary font-bold text-sm">{kpi.title}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="xl:col-span-2 card p-6 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">Active Projects</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" placeholder="Search..." className="bg-white border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm font-medium" />
              </div>
              <button className="p-2 bg-white border border-border rounded-lg text-text-muted hover:text-text-primary shadow-sm hover:border-border-strong">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted text-sm">
                  <th className="pb-3 font-bold">Project Name</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Progress</th>
                  <th className="pb-3 font-bold">PM</th>
                  <th className="pb-3 font-bold">Last Update</th>
                  <th className="pb-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {projects.map((proj) => (
                  <tr key={proj.id} className="border-b border-border hover:bg-bg-muted transition-colors group cursor-pointer" onClick={() => router.push(`/hq/project/${proj.id}`)}>
                    <td className="py-4 font-bold text-text-primary">{proj.name}</td>
                    <td className="py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                        proj.status === 'delayed' ? 'bg-danger-bg text-danger border-danger/20' :
                        proj.status === 'at_risk' ? 'bg-warning-bg text-warning border-warning/20' :
                        'bg-success-bg text-success border-success/20'
                      }`}>
                        {proj.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 w-32">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-bg-muted border border-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${proj.status === 'delayed' ? 'bg-danger' : proj.status === 'at_risk' ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${proj.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary font-bold font-mono">{proj.percent}%</span>
                      </div>
                    </td>
                    <td className="py-4 text-text-secondary font-medium">{proj.pm}</td>
                    <td className="py-4 text-text-muted text-xs font-semibold">{proj.lastUpdate}</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/hq/project/${proj.id}`); }}
                        className="text-brand-600 hover:text-brand-800 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100"
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
