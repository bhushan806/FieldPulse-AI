"use client";

/**
 * frontend/app/hq/project/page.tsx
 * HQ project drill-down: select a project and view its dashboard.
 */
import { useQuery } from "@tanstack/react-query";
import { getPortfolioDashboard, getProjectDashboard } from "@/lib/api/dashboard";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { FolderOpen } from "lucide-react";

export default function HqProjectPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: getPortfolioDashboard,
  });

  const { data: projData, isLoading: projLoading } = useQuery({
    queryKey: ["dashboard", selectedId],
    queryFn: () => getProjectDashboard(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-8">Project Details</h1>

      {/* Project selector */}
      <div className="glass p-4 mb-6">
        <label className="text-sm text-slate-400 mb-2 block">Select Project</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-violet-500"
        >
          <option value="">— Choose a project —</option>
          {portfolio?.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!selectedId && (
        <div className="glass p-16 text-center">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Select a project above to view details</p>
        </div>
      )}

      {projLoading && selectedId && (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="glass h-32 animate-pulse rounded-xl" />)}
        </div>
      )}

      {projData && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">{projData.projectName}</h2>
            </div>
            <StatusBadge status={projData.status} className="text-sm px-4 py-1.5" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Overall", value: `${projData.overallPercentComplete}%` },
              { label: "Activities", value: projData.totalActivities },
              { label: "Completed", value: projData.completedActivities },
              { label: "Delayed", value: projData.delayedActivities },
            ].map(({ label, value }) => (
              <div key={label} className="glass p-4 text-center">
                <p className="text-2xl font-bold text-slate-100">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="glass p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">S-Curve</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={projData.sCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="plannedPercent" name="Planned" stroke="#8b5cf6" fill="rgba(139,92,246,0.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="actualPercent" name="Actual" stroke="#f97316" fill="rgba(249,115,22,0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
