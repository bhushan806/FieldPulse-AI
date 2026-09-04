'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, CheckCircle2, AlertTriangle, Clock, CalendarDays, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const sCurveData = [
  { date: 'Mon', planned: 10, actual: 12 },
  { date: 'Tue', planned: 25, actual: 22 },
  { date: 'Wed', planned: 40, actual: 35 },
  { date: 'Thu', planned: 55, actual: 48 },
  { date: 'Fri', planned: 70, actual: 65 },
  { date: 'Sat', planned: 85, actual: 78 },
  { date: 'Sun', planned: 100, actual: 82 },
];

export default function ProjectDrillDown({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={40} /></div>;

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
            <h1 className="text-2xl font-bold text-white">Sector 4 Pipeline</h1>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">On Track</span>
          </div>
          <p className="text-slate-400 text-sm flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Assam, India</span>
            <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> ETA: Nov 2026</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-6">Progress S-Curve</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <Area type="monotone" dataKey="planned" name="Planned %" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" />
                  <Area type="monotone" dataKey="actual" name="Actual %" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Critical Path Activities</h2>
            <div className="space-y-3">
              {[
                { name: 'Pipeline Welding Segment A', complete: 90, status: 'delayed', expected: 'Sep 03' },
                { name: 'Trenching Sector 4B', complete: 45, status: 'in_progress', expected: 'Sep 10' },
                { name: 'Quality Inspection', complete: 0, status: 'pending', expected: 'Sep 15' },
              ].map((act, i) => (
                <div key={i} className="p-3 border border-slate-700/50 rounded-xl bg-slate-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white text-sm">{act.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      act.status === 'delayed' ? 'bg-red-500/10 text-red-400' :
                      act.status === 'in_progress' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {act.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${act.status === 'delayed' ? 'bg-red-500' : act.status === 'in_progress' ? 'bg-orange-500' : 'bg-slate-600'}`}
                        style={{ width: `${act.complete}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-300 w-8">{act.complete}%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Due: {act.expected}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Project Details</h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Project Manager</span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">RS</div>
                  <div>
                    <p className="text-sm font-medium text-white">Rahul Sharma</p>
                    <p className="text-xs text-slate-400">+91 98765 43210</p>
                  </div>
                </div>
              </div>
              <div className="w-full h-px bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Field Engineers</span>
                <p className="text-sm text-white font-medium">4 Active</p>
              </div>
              <div className="w-full h-px bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Total Activities</span>
                <p className="text-sm text-white font-medium">124 (45 Completed)</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Captures</h2>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square rounded-lg bg-slate-800 overflow-hidden relative group cursor-pointer">
                  <img src={`https://images.unsplash.com/photo-1541888087616-56af7b4f51fa?q=80&w=200&auto=format&fit=crop&sig=${i}`} alt="Site" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <span className="text-[10px] text-white font-medium">Sep 04</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
              View All Captures &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
