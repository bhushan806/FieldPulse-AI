'use client';

import { useRouter } from 'next/navigation';
import { Plus, Briefcase, Search, Filter, MoreVertical, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function HQProjectsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['hqProjects'],
    queryFn: async () => {
      const res = await apiClient.get('/api/dashboard/portfolio');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const projects = data?.projects || [];

  const statusConfig: Record<string, { label: string; icon: any; classes: string }> = {
    on_track: { label: 'On Track', icon: CheckCircle2, classes: 'bg-success-bg text-success border-success/20' },
    at_risk: { label: 'At Risk', icon: AlertTriangle, classes: 'bg-warning-bg text-warning border-warning/20' },
    delayed: { label: 'Delayed', icon: Clock, classes: 'bg-danger-bg text-danger border-danger/20' },
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Projects"
          subtitle={`${projects.length} total project${projects.length !== 1 ? 's' : ''} in portfolio`}
        />

        <button
          onClick={() => router.push('/hq/projects/new')}
          className="btn-primary px-5 py-2.5 text-sm shadow-sm font-semibold flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'On Track', value: data?.on_track ?? 0, classes: 'text-success bg-success-bg border-success/20' },
          { label: 'At Risk', value: data?.at_risk ?? 0, classes: 'text-warning bg-warning-bg border-warning/20' },
          { label: 'Delayed', value: data?.delayed ?? 0, classes: 'text-danger bg-danger-bg border-danger/20' },
        ].map((s) => (
          <div key={s.label} className={`card p-5 border shadow-sm ${s.classes}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Projects Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        {/* Table Header Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-600" />
            All Projects
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-white border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none w-48 shadow-sm"
              />
            </div>
            <button className="p-2 bg-white border border-border rounded-lg text-text-muted hover:text-text-primary shadow-sm hover:border-border-strong">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size={36} />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Briefcase className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-semibold text-text-secondary mb-2">No projects yet</p>
            <p className="text-sm text-text-muted mb-4">Get started by creating your first project.</p>
            <button
              onClick={() => router.push('/hq/projects/new')}
              className="btn-primary px-5 py-2 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Project
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-muted/50 text-text-muted text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-bold">Project Name</th>
                  <th className="px-6 py-3 font-bold">Status</th>
                  <th className="px-6 py-3 font-bold">Progress</th>
                  <th className="px-6 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((proj: any) => {
                  const statusKey = proj.status as string;
                  const cfg = statusConfig[statusKey] ?? statusConfig['on_track'];
                  const StatusIcon = cfg.icon;
                  const percent = proj.percentComplete ?? 0;
                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-bg-muted/40 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/hq/projects/${proj.id}/setup`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-primary group-hover:text-brand-600 transition-colors">
                          {proj.name}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.classes}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 w-48">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-bg-muted border border-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                statusKey === 'delayed' ? 'bg-danger' :
                                statusKey === 'at_risk' ? 'bg-warning' : 'bg-success'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-text-secondary w-10 text-right">
                            {percent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/hq/projects/${proj.id}/setup`); }}
                            className="text-brand-600 hover:text-brand-800 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
