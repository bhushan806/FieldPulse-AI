"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient, apiRequest } from "@/lib/apiClient";
import { PageHeader } from "@/components/shared/PageHeader";
import { 
  Users, 
  FileText, 
  Calendar, 
  Info, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  UploadCloud,
  Check,
  ExternalLink
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function ProjectSetupWorkspace() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Project Setup Workspace" 
        subtitle="Configure your project details, team, documents, and schedule."
      />

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto custom-scrollbar">
        {[
          { id: "overview", label: "Overview", icon: Info },
          { id: "team", label: "Team & Access", icon: Users },
          { id: "documents", label: "Documents", icon: FileText },
          { id: "schedule", label: "Schedule", icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/10" 
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-bg-muted"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Container */}
      <div className="card p-6 min-h-[420px] shadow-sm">
        {activeTab === "overview" && <OverviewTab projectId={projectId} onNavigateTab={setActiveTab} />}
        {activeTab === "team" && <TeamTab projectId={projectId} />}
        {activeTab === "documents" && <DocumentsTab projectId={projectId} onGoToSchedule={() => setActiveTab("schedule")} />}
        {activeTab === "schedule" && <ScheduleTab projectId={projectId} />}
      </div>
    </div>
  );
}

function OverviewTab({ projectId, onNavigateTab }: { projectId: string; onNavigateTab: (tab: string) => void }) {
  const { data: project, isLoading } = useQuery({
    queryKey: ['project_details', projectId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/api/projects/${projectId}`);
        return res.data;
      } catch {
        return null;
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            {isLoading ? "Loading project..." : project?.name || "Project Details"}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure metadata, assign leadership, upload documentation, and verify schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/20">
            {project?.status || "Active Setup"}
          </span>
        </div>
      </div>

      {/* Project Meta Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-bg-muted rounded-xl border border-border space-y-1">
          <div className="flex items-center gap-2 text-text-muted text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-brand-500" />
            <span>Project Identifier</span>
          </div>
          <p className="font-mono text-xs font-bold text-text-primary truncate" title={projectId}>
            {projectId}
          </p>
        </div>

        <div className="p-4 bg-bg-muted rounded-xl border border-border space-y-1">
          <div className="flex items-center gap-2 text-text-muted text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>Geographic Coordinates</span>
          </div>
          <p className="font-mono text-xs font-bold text-text-primary">
            {project?.location_lat != null && project?.location_lng != null
              ? `${project.location_lat.toFixed(4)}, ${project.location_lng.toFixed(4)}`
              : "Lat: 0.0000, Lng: 0.0000"}
          </p>
        </div>

        <div className="p-4 bg-bg-muted rounded-xl border border-border space-y-1">
          <div className="flex items-center gap-2 text-text-muted text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Schedule Duration</span>
          </div>
          <p className="text-xs font-bold text-text-primary">
            {project?.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'} —{' '}
            {project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}
          </p>
        </div>
      </div>

      {/* Setup Checklist & Next Steps */}
      <div className="pt-2">
        <h4 className="text-sm font-bold text-text-primary mb-3">Setup Checklist</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => onNavigateTab('team')}
            className="p-4 rounded-xl border border-border bg-surface hover:border-brand-500 hover:shadow-md transition-all cursor-pointer group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand-500 transition-colors" />
            </div>
            <h5 className="text-sm font-bold text-text-primary">Assign Project Manager</h5>
            <p className="text-xs text-text-secondary leading-relaxed">
              Invite a dedicated PM to manage daily field evidence, schedule tracking, and site rosters.
            </p>
          </div>

          <div 
            onClick={() => onNavigateTab('documents')}
            className="p-4 rounded-xl border border-border bg-surface hover:border-brand-500 hover:shadow-md transition-all cursor-pointer group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-emerald-500 transition-colors" />
            </div>
            <h5 className="text-sm font-bold text-text-primary">Upload Schedule PDFs</h5>
            <p className="text-xs text-text-secondary leading-relaxed">
              Upload Primavera or schedule documents. AI will parse all activities and WBS codes automatically.
            </p>
          </div>

          <div 
            onClick={() => onNavigateTab('schedule')}
            className="p-4 rounded-xl border border-border bg-surface hover:border-brand-500 hover:shadow-md transition-all cursor-pointer group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-indigo-500 transition-colors" />
            </div>
            <h5 className="text-sm font-bold text-text-primary">Review & Publish Schedule</h5>
            <p className="text-xs text-text-secondary leading-relaxed">
              Use the AI Schedule Review Gate to approve extracted activities before field teams begin capture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleAddManager(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
    };

    try {
      await apiClient.post(`/api/projects/${projectId}/managers`, data);
      setSuccessMsg("Manager invited successfully! An onboarding link has been dispatched.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to add manager");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-lg font-bold text-text-primary">Invite Project Manager</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          The assigned project manager will have authority to review engineer captures, schedule activities, and resolve alerts.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-danger-bg text-danger text-xs font-semibold rounded-lg border border-danger/20">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-success-bg text-success text-xs font-semibold rounded-lg border border-success/20 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <span>{successMsg}</span>
        </div>
      )}
      
      <form onSubmit={handleAddManager} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">Full Name</label>
          <input 
            name="name" 
            placeholder="e.g. Priya Sharma"
            required 
            className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 outline-none shadow-sm" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">Official Email Address</label>
          <input 
            type="email" 
            name="email" 
            placeholder="pm@company.com"
            required 
            className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 outline-none shadow-sm" 
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm">
          {loading ? "Sending Invitation..." : "Send Manager Invitation"}
        </button>
      </form>
    </div>
  );
}

function DocumentsTab({ projectId, onGoToSchedule }: { projectId: string; onGoToSchedule?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  async function loadDocs() {
    setLoadingDocs(true);
    try {
      const res = await apiClient.get(`/api/documents/?project_id=${projectId}`);
      setDocs(res.data?.items || []);
    } catch {
      // ignore
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, [projectId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("file", file);

    try {
      await apiRequest("/api/documents/", {
        method: "POST",
        body: formData,
      });
      setMessage("Document uploaded! AI extraction started in the background. Review extracted activities in the Schedule tab.");
      setFile(null);
      loadDocs();
    } catch {
      setMessage("Upload failed. Please check file format.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="max-w-xl space-y-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Upload Project Documents</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Upload PDF project schedules or specifications. AI automatically extracts activities, codes, and keywords.
          </p>
        </div>
        
        {message && (
          <div className="p-3 bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-semibold rounded-lg border border-brand-500/20 flex items-center justify-between gap-2">
            <span>{message}</span>
            {onGoToSchedule && (
              <button 
                type="button" 
                onClick={onGoToSchedule}
                className="underline font-bold flex-shrink-0"
              >
                Go to Schedule →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="p-4 border-2 border-dashed border-border rounded-xl bg-bg-muted/40 hover:bg-bg-muted/70 transition-colors">
            <input 
              type="file" 
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-text-secondary
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-xs file:font-semibold
                file:bg-brand-500/15 file:text-brand-600 dark:file:text-brand-400
                hover:file:bg-brand-500/25 cursor-pointer"
            />
          </div>
          <button 
            type="submit" 
            disabled={!file || uploading} 
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? "Uploading & Extracting..." : "Upload Document"}</span>
          </button>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="pt-6 border-t border-border">
        <h4 className="text-base font-bold text-text-primary mb-3">Project Documents</h4>
        {loadingDocs ? (
          <div className="p-4 text-xs text-text-muted">Loading documents...</div>
        ) : docs.length === 0 ? (
          <div className="p-4 bg-bg-muted rounded-lg text-xs text-text-secondary border border-border">
            No documents uploaded yet. Upload a schedule PDF to begin automated activity extraction.
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3.5 bg-bg-muted rounded-xl border border-border text-xs">
                <div>
                  <div className="font-bold text-text-primary">{doc.filename}</div>
                  <div className="text-text-muted text-[11px] mt-0.5">
                    {(doc.sizeBytes / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    doc.status === 'analyzed' ? 'bg-success/15 text-success border border-success/30' :
                    doc.status === 'processing' ? 'bg-warning/15 text-warning border border-warning/30' :
                    'bg-bg-muted text-text-secondary border border-border'
                  }`}>
                    {doc.status}
                  </span>
                  {doc.structuredData?.activities && (
                    <span className="bg-brand-500/15 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded font-bold text-[10px] border border-brand-500/20">
                      {doc.structuredData.activities.length} Activities Found
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleTab({ projectId }: { projectId: string }) {
  const [extractedActivities, setExtractedActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const docRes = await apiClient.get(`/api/documents/?project_id=${projectId}`);
      const docs = docRes.data?.items || [];
      const found: any[] = [];
      for (const d of docs) {
        if (d.structuredData?.activities && Array.isArray(d.structuredData.activities)) {
          found.push(...d.structuredData.activities);
        }
      }
      setExtractedActivities(found);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function handleImportSchedule() {
    if (extractedActivities.length === 0) return;
    setImporting(true);
    setImportError("");
    try {
      await apiClient.post(`/api/projects/${projectId}/schedule/bulk`, {
        activities: extractedActivities
      });
      setImportSuccess(true);
      await loadData();
    } catch (err: any) {
      setImportError(err.response?.data?.detail || err.message || "Failed to import schedule");
    } finally {
      setImporting(false);
    }
  }

  function handleRemoveItem(idx: number) {
    setExtractedActivities(prev => prev.filter((_, i) => i !== idx));
  }

  function handleUpdateField(idx: number, field: string, val: string) {
    setExtractedActivities(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h3 className="text-lg font-bold text-text-primary">AI Schedule Review Gate</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Review, edit, and approve extracted activities before publishing them to the live project schedule.
          </p>
        </div>
        {extractedActivities.length > 0 && (
          <button
            type="button"
            onClick={handleImportSchedule}
            disabled={importing || importSuccess}
            className="btn-primary py-2 px-5 text-sm flex items-center gap-2 shadow-sm flex-shrink-0"
          >
            {importing ? "Importing..." : importSuccess ? "Schedule Published" : "Confirm & Import to Schedule"}
          </button>
        )}
      </div>

      {importSuccess && (
        <div className="p-4 bg-success-bg border border-success/30 text-success rounded-xl text-sm flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-success text-white flex items-center justify-center font-bold text-xs">✓</div>
          <div>
            <div className="font-bold">Schedule Successfully Published!</div>
            <div className="text-xs text-success/90 mt-0.5">The activities have been committed to the live schedule. Site engineers can now link field captures.</div>
          </div>
        </div>
      )}

      {importError && (
        <div className="p-3 bg-danger-bg border border-danger/20 text-danger rounded-lg text-xs">
          {importError}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-text-muted">Loading schedule information...</div>
      ) : extractedActivities.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 rounded-xl bg-bg-muted/30">
          <Calendar className="w-12 h-12 text-text-muted mb-3" />
          <h4 className="text-base font-bold text-text-primary mb-1">No Extracted Activities Staged</h4>
          <p className="text-xs text-text-secondary max-w-sm mb-4">
            Upload a project schedule document (PDF) in the Documents tab. AI will parse the activities and stage them here for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              {extractedActivities.length} Activities Staged for Review
            </span>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-muted border-b border-border font-bold text-text-secondary">
                  <th className="p-3">WBS / Code</th>
                  <th className="p-3">Activity Name</th>
                  <th className="p-3">Keywords</th>
                  <th className="p-3">Source</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {extractedActivities.map((act, idx) => (
                  <tr key={idx} className="hover:bg-bg-muted/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-brand-600 dark:text-brand-400 w-36">
                      <input 
                        type="text"
                        value={act.activity_code || ''}
                        onChange={(e) => handleUpdateField(idx, 'activity_code', e.target.value)}
                        className="bg-surface border border-border/80 hover:border-brand-500 focus:border-brand-500 rounded px-2 py-1 w-full outline-none font-bold text-text-primary"
                      />
                    </td>
                    <td className="p-3 text-text-primary">
                      <input 
                        type="text"
                        value={act.activity_name || ''}
                        onChange={(e) => handleUpdateField(idx, 'activity_name', e.target.value)}
                        className="bg-surface border border-border/80 hover:border-brand-500 focus:border-brand-500 rounded px-2 py-1 w-full outline-none font-semibold text-text-primary"
                      />
                    </td>
                    <td className="p-3 text-text-secondary">
                      <div className="flex flex-wrap gap-1">
                        {(act.keywords || []).map((kw: string, kIdx: number) => (
                          <span key={kIdx} className="bg-bg-muted px-2 py-0.5 rounded text-[10px] border border-border font-medium text-text-secondary">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                        {act.source || 'ai_extracted'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                        title="Remove from schedule"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
