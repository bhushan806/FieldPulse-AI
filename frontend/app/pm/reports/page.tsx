"use client";

/**
 * frontend/app/pm/reports/page.tsx
 * Project report export page.
 */
import { useState } from "react";
import { exportReport } from "@/lib/api/dashboard";
import { useAuthStore } from "@/store/authStore";
import { getUserProjectIds } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { FileText, Download, Loader2 } from "lucide-react";

export default function PmReportsPage() {
  const { user } = useAuthStore();
  const { addNotification } = useUiStore();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const projectId = getUserProjectIds(user)[0];
    if (!projectId) { addNotification({ type: "error", message: "No project assigned." }); return; }
    setLoading(true);
    try {
      const report = await exportReport(projectId);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FieldPulse_Report_${projectId}_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addNotification({ type: "success", message: "Report downloaded." });
    } catch (e: unknown) {
      addNotification({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-8">Reports</h1>
      <div className="glass p-8 max-w-lg">
        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6">
          <FileText className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-2">Project Progress Report</h2>
        <p className="text-slate-400 text-sm mb-6">
          Export a comprehensive JSON report including all activities, recent captures, and alerts.
        </p>
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-3 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-xl transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          Export Report
        </button>
      </div>
    </div>
  );
}
