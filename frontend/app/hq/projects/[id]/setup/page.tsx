"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { apiClient } from "@/lib/apiClient"
import { PageHeader } from "@/components/shared/PageHeader"
import { Users, FileText, Calendar, Info } from "lucide-react"

export default function ProjectSetupWorkspace() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Project Setup Workspace" 
        subtitle="Configure your project details, team, documents, and schedule."
      />

      <div className="flex border-b border-border mb-6">
        {[
          { id: "overview", label: "Overview", icon: Info },
          { id: "team", label: "Team & Access", icon: Users },
          { id: "documents", label: "Documents", icon: FileText },
          { id: "schedule", label: "Schedule", icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === tab.id 
                ? "border-brand-500 text-brand-600 bg-brand-50/50" 
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-bg-muted"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-border shadow-sm min-h-[400px]">
        {activeTab === "overview" && <OverviewTab projectId={projectId} />}
        {activeTab === "team" && <TeamTab projectId={projectId} />}
        {activeTab === "documents" && <DocumentsTab projectId={projectId} />}
        {activeTab === "schedule" && <ScheduleTab projectId={projectId} />}
      </div>
    </div>
  )
}

function OverviewTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Project Details</h3>
      <p className="text-text-secondary">Basic project information goes here.</p>
      <div className="p-4 bg-bg-muted rounded-lg border border-border">
        Project ID: {projectId}
      </div>
    </div>
  )
}

function TeamTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  async function handleAddManager(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMsg("")

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
    }

    try {
      const res = await apiClient.post(`/api/projects/${projectId}/managers`, data)
      setSuccessMsg("Manager invited successfully!")
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setError(err.message || "Failed to add manager")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h3 className="text-lg font-bold">Invite Project Manager</h3>
      {error && <div className="p-3 bg-danger-bg text-danger text-sm rounded-lg border border-danger/20">{error}</div>}
      {successMsg && <div className="p-3 bg-success-bg text-success text-sm rounded-lg border border-success/20">{successMsg}</div>}
      
      <form onSubmit={handleAddManager} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input name="name" required className="w-full p-2 border border-border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" name="email" required className="w-full p-2 border border-border rounded-lg" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2">
          {loading ? "Inviting..." : "Send Invitation"}
        </button>
      </form>
    </div>
  )
}

function DocumentsTab({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setMessage("")

    const formData = new FormData()
    formData.append("project_id", projectId)
    formData.append("file", file)

    try {
      // Direct axios post for multipart/form-data
      await apiClient.post("/api/documents", formData)
      setMessage("Document uploaded! AI extraction started in the background.")
      setFile(null)
    } catch (err: any) {
      setMessage("Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h3 className="text-lg font-bold">Upload Project Documents</h3>
      <p className="text-sm text-text-secondary">Upload schedule PDFs to automatically extract activities using AI.</p>
      
      {message && <div className="p-3 bg-brand-50 text-brand-700 text-sm rounded-lg">{message}</div>}

      <form onSubmit={handleUpload} className="space-y-4">
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-text-secondary
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-brand-50 file:text-brand-700
            hover:file:bg-brand-100"
        />
        <button type="submit" disabled={!file || uploading} className="btn-primary w-full py-2">
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>
    </div>
  )
}

function ScheduleTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Project Schedule</h3>
      <p className="text-text-secondary">The schedule activities extracted from your documents will appear here.</p>
    </div>
  )
}
