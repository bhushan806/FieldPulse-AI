"use client";

import { FileText } from "lucide-react";

export default function HqReportsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-8">Reports</h1>
      <div className="glass p-8 max-w-lg">
        <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
          <FileText className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-2">Portfolio Reports</h2>
        <p className="text-slate-400 text-sm mb-6">
          Global and cross-project reporting is currently under development. 
          To download a report for a specific project, please navigate to that project&apos;s dashboard.
        </p>
      </div>
    </div>
  );
}
