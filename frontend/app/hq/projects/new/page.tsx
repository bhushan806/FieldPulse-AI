"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { ArrowLeft, Building2, Calendar, MapPin } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      locationLat: parseFloat(formData.get("lat") as string) || 0,
      locationLng: parseFloat(formData.get("lng") as string) || 0,
      startDate: formData.get("start_date") as string,
      endDate: formData.get("end_date") as string,
    };

    try {
      const res = await apiClient.post("/api/projects", data);
      router.push(`/hq/projects/${res.data.id}/setup`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(", ")
        : typeof detail === "string"
        ? detail
        : err.message || "Failed to create project";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 animate-in">
      <div className="w-full max-w-2xl card p-6 sm:p-8 shadow-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-3 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Create New Project</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Enter basic project parameters to initialize the setup workspace.
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 text-xs font-semibold text-danger bg-danger-bg rounded-xl border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Project Name <span className="text-danger">*</span>
            </label>
            <input 
              name="name" 
              placeholder="e.g. Metro Line Extension Phase 2"
              required 
              className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 outline-none shadow-sm font-medium" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-500" />
                <span>Planned Start Date</span> <span className="text-danger">*</span>
              </label>
              <input 
                type="datetime-local" 
                name="start_date" 
                required 
                className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-brand-500 outline-none shadow-sm" 
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-500" />
                <span>Planned End Date</span> <span className="text-danger">*</span>
              </label>
              <input 
                type="datetime-local" 
                name="end_date" 
                required 
                className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-brand-500 outline-none shadow-sm" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Site Latitude</span> <span className="text-danger">*</span>
              </label>
              <input 
                type="number" 
                step="any" 
                name="lat" 
                placeholder="e.g. 19.0760"
                required 
                className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 outline-none shadow-sm font-mono" 
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Site Longitude</span> <span className="text-danger">*</span>
              </label>
              <input 
                type="number" 
                step="any" 
                name="lng" 
                placeholder="e.g. 72.8777"
                required 
                className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 outline-none shadow-sm font-mono" 
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <button 
              type="button" 
              onClick={() => router.back()} 
              className="btn-outline px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary px-6 py-2 text-xs shadow-sm"
            >
              {loading ? "Creating..." : "Create Project & Continue →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
