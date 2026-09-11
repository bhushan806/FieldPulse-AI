"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { ArrowLeft, Calendar, Upload } from "lucide-react";

export default function BulkSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [jsonInput, setJsonInput] = useState(`[\n  {\n    "activity_code": "EXC-01",\n    "activity_name": "Site Excavation",\n    "planned_start": "2024-01-01T08:00:00Z",\n    "planned_end": "2024-01-15T18:00:00Z",\n    "keywords": ["excavation", "digging", "earthwork"]\n  }\n]`);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const activities = JSON.parse(jsonInput);
      if (!Array.isArray(activities)) {
        throw new Error("Input must be a JSON array of activities");
      }
      
      await apiClient.post(`/api/projects/${projectId}/schedule/bulk`, { activities });
      setSuccess(true);
      setTimeout(() => router.push(`/hq/projects/${projectId}/setup`), 1500);
    } catch (err: any) {
      setError(err.message || "Invalid JSON or failed to upload schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 animate-in">
      <div className="w-full max-w-4xl card p-6 sm:p-8 shadow-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Setup</span>
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-3 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Bulk Add Schedule</h1>
            <p className="text-xs text-text-secondary mt-0.5">Paste a JSON array of activities to initialize the project schedule.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 text-xs font-semibold text-danger bg-danger-bg rounded-xl border border-danger/20">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 text-xs font-semibold text-success bg-success-bg rounded-xl border border-success/30">
            Schedule imported successfully! Returning to workspace...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Activity Definitions (JSON Array)
            </label>
            <textarea 
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              className="w-full p-4 font-mono text-xs border border-border rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-surface text-text-primary outline-none custom-scrollbar"
              required
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <button 
              type="button" 
              onClick={() => router.push(`/hq/projects/${projectId}/setup`)} 
              className="btn-outline px-4 py-2 text-xs"
            >
              Skip
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary px-6 py-2 text-xs flex items-center gap-2 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{loading ? "Importing..." : "Import Schedule"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
