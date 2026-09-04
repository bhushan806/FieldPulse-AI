'use client';

import { AlertTriangle, Clock, Activity, Filter, Search, MoreVertical, Building2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';

export default function AlertsCenter() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const alerts = [
    { id: 1, type: 'critical', project: 'Sector 4 Pipeline', message: 'Activity PIP-04 is 3 days behind schedule. Critical path impacted.', time: '2h ago', status: 'Unresolved' },
    { id: 2, type: 'critical', project: 'Pump Station B', message: 'Material shortage detected for Foundation Phase.', time: '5h ago', status: 'Unresolved' },
    { id: 3, type: 'warning', project: 'Storage Tank 12', message: 'Low confidence AI match (45%) on recent capture.', time: '1d ago', status: 'Pending Review' },
    { id: 4, type: 'info', project: 'Sector 4 Pipeline', message: 'Phase 2 Excavation marked 100% complete.', time: '1d ago', status: 'Resolved' },
    { id: 5, type: 'warning', project: 'Pump Station B', message: 'Unusual delay pattern detected in structural activities.', time: '2d ago', status: 'Investigating' },
  ];

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);

  return (
    <div className="space-y-6 animate-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader 
          title="Alerts Center" 
          subtitle="Global portfolio notifications and AI anomalies."
        />
      </div>

      <div className="card flex-1 flex flex-col min-h-0 overflow-hidden p-0">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-muted/50">
          <div className="flex gap-2">
            {['all', 'critical', 'warning', 'info'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  filter === f 
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' 
                    : 'bg-white text-text-secondary hover:bg-bg-muted border border-border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search alerts..." 
                className="w-full bg-white border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm font-medium"
              />
            </div>
            <button className="p-2.5 bg-white border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors shadow-sm hover:border-border-strong">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-bg-muted/30">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted bg-white border border-border border-dashed rounded-xl shadow-sm">
              <AlertTriangle className="w-12 h-12 mb-4 text-border-strong" />
              <p className="font-semibold text-text-secondary">No alerts found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="flex flex-col sm:flex-row gap-4 p-5 rounded-xl bg-white hover:shadow-md transition-all border border-border hover:border-brand-300 group cursor-pointer">
                  <div className="mt-1 flex-shrink-0">
                    {alert.type === 'critical' ? (
                      <div className="w-10 h-10 rounded-full bg-danger-bg border border-danger/20 flex items-center justify-center text-danger shadow-sm">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    ) : alert.type === 'warning' ? (
                      <div className="w-10 h-10 rounded-full bg-warning-bg border border-warning/20 flex items-center justify-center text-warning shadow-sm">
                        <Activity className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                        <Clock className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        alert.type === 'critical' ? 'bg-danger-bg text-danger border-danger/20' :
                        alert.type === 'warning' ? 'bg-warning-bg text-warning border-warning/20' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-xs text-text-muted font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {alert.time}
                      </span>
                    </div>
                    
                    <p className="text-sm font-bold text-text-primary mb-2.5">{alert.message}</p>
                    
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-text-secondary font-bold flex items-center gap-1.5 bg-bg-muted px-2 py-1 rounded border border-border">
                        <Building2 className="w-3.5 h-3.5 text-text-muted" />
                        {alert.project}
                      </span>
                      <span className={`${
                        alert.status === 'Resolved' ? 'text-success font-bold' :
                        alert.status === 'Investigating' ? 'text-warning font-bold' : 'text-text-muted font-semibold'
                      }`}>
                        Status: {alert.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
                    <button className="px-4 py-2 rounded-lg bg-white border border-border hover:bg-bg-muted text-xs text-text-primary font-bold shadow-sm transition-colors">
                      View Details
                    </button>
                    {alert.status !== 'Resolved' && (
                      <button className="px-4 py-2 rounded-lg border border-border hover:bg-success-bg hover:text-success hover:border-success/30 text-xs text-text-secondary font-bold shadow-sm transition-colors">
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
