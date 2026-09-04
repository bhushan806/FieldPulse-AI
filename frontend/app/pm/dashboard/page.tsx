'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';

const sCurveData = [
  { date: 'Mon', planned: 10, actual: 12 },
  { date: 'Tue', planned: 25, actual: 22 },
  { date: 'Wed', planned: 40, actual: 35 },
  { date: 'Thu', planned: 55, actual: 48 },
  { date: 'Fri', planned: 70, actual: 65 },
  { date: 'Sat', planned: 85, actual: 78 },
  { date: 'Sun', planned: 100, actual: 82 },
];

export default function PMDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={40} /></div>;

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Project Overview" 
        subtitle="Monitoring Sector 4 Pipeline Expansion"
        badge={{ label: 'Active', color: 'success' }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: 'Overall Progress', value: '82%', icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50', trend: '-3% vs plan' },
          { title: 'Pending Reviews', value: '14', icon: CheckSquare, color: 'text-warning', bg: 'bg-warning-bg', trend: '+5 since yesterday' },
          { title: 'Delayed Activities', value: '3', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Requires attention' },
          { title: 'Critical Alerts', value: '1', icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-bg', trend: 'Unresolved' },
        ].map((kpi, i) => (
          <div key={i} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-text-primary">{kpi.value}</span>
            </div>
            <h3 className="text-text-secondary font-semibold">{kpi.title}</h3>
            <p className="text-xs text-text-muted mt-1">{kpi.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="xl:col-span-2 card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">Progress S-Curve</h2>
            <select className="bg-white border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 outline-none focus:border-brand-500 shadow-sm">
              <option>This Week</option>
              <option>This Month</option>
              <option>Overall</option>
            </select>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <Area type="monotone" dataKey="planned" name="Planned %" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" />
                <Area type="monotone" dataKey="actual" name="Actual %" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts & Activity */}
        <div className="card p-6 flex flex-col">
          <h2 className="text-lg font-bold text-text-primary mb-6">Recent Alerts</h2>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { type: 'critical', title: 'Schedule Delay', desc: 'Activity PIP-04 is 3 days behind schedule. Critical path impacted.', time: '2h ago' },
              { type: 'warning', title: 'Low Confidence Match', desc: 'Capture #8492 needs manual review for EXC-01.', time: '4h ago' },
              { type: 'info', title: 'Material Delivered', desc: 'Cement batch #102 verified at Sector 4.', time: '5h ago' },
              { type: 'info', title: 'Activity Completed', desc: 'Foundation laying for Pump Station A is 100% complete.', time: '1d ago' },
            ].map((alert, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-bg-muted transition-colors border border-transparent hover:border-border cursor-pointer">
                <div className="mt-1 flex-shrink-0">
                  {alert.type === 'critical' ? <AlertTriangle className="w-5 h-5 text-danger" /> :
                   alert.type === 'warning' ? <Activity className="w-5 h-5 text-warning" /> :
                   <CheckSquare className="w-5 h-5 text-success" />}
                </div>
                <div>
                  <h4 className={`text-sm font-semibold mb-1 ${
                    alert.type === 'critical' ? 'text-danger' :
                    alert.type === 'warning' ? 'text-warning' : 'text-text-primary'
                  }`}>{alert.title}</h4>
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{alert.desc}</p>
                  <span className="text-[10px] text-text-muted mt-2 block font-medium">{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
