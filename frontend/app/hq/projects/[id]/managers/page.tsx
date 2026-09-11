"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { ArrowLeft, UserPlus, Check, Copy } from "lucide-react";

export default function ProjectManagersPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleAddManager(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    setInviteToken("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
    };

    try {
      const res = await apiClient.post(`/api/projects/${projectId}/managers`, data);
      setSuccessMsg(res.data.message || "Project manager invited successfully!");
      setInviteToken(res.data.invite_token);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to add manager");
    } finally {
      setLoading(false);
    }
  }

  const handleCopyLink = () => {
    if (!inviteToken) return;
    const link = `${window.location.origin}/set-password?token=${inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 animate-in">
      <div className="w-full max-w-2xl card p-6 sm:p-8 shadow-md">
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
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Add Project Manager</h1>
            <p className="text-xs text-text-secondary mt-0.5">Invite a Project Manager to oversee this project.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 text-xs font-semibold text-danger bg-danger-bg rounded-xl border border-danger/20">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 text-xs font-semibold text-success bg-success-bg rounded-xl border border-success/30 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span>{successMsg}</span>
            </div>
            {inviteToken && (
              <div className="p-3 bg-surface rounded-lg border border-border flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-text-secondary truncate">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/set-password?token=${inviteToken}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-outline px-2.5 py-1 text-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleAddManager} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Manager Full Name <span className="text-danger">*</span>
            </label>
            <input 
              name="name" 
              placeholder="e.g. Priya Sharma"
              required 
              className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 outline-none shadow-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Manager Email <span className="text-danger">*</span>
            </label>
            <input 
              type="email" 
              name="email" 
              placeholder="pm@company.com"
              required 
              className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 outline-none shadow-sm" 
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-border">
            <button 
              type="button" 
              onClick={() => router.push(`/hq/projects/${projectId}/setup`)} 
              className="btn-outline px-4 py-2 text-xs"
            >
              Skip / Setup Workspace
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary px-6 py-2 text-xs shadow-sm"
            >
              {loading ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
