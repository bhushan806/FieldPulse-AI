"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { apiClient } from "@/lib/apiClient"

export default function BulkSchedulePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [jsonInput, setJsonInput] = useState(`[\n  {\n    "activity_code": "EXC-01",\n    "activity_name": "Site Excavation",\n    "planned_start": "2024-01-01T08:00:00Z",\n    "planned_end": "2024-01-15T18:00:00Z",\n    "keywords": ["excavation", "digging", "earthwork"]\n  }\n]`)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const activities = JSON.parse(jsonInput)
      if (!Array.isArray(activities)) {
        throw new Error("Input must be a JSON array of activities")
      }
      
      await apiClient.post(`/api/projects/${projectId}/schedule/bulk`, { activities })
      setSuccess(true)
      setTimeout(() => router.push("/hq"), 2000)
    } catch (err: any) {
      setError(err.message || "Invalid JSON or failed to upload schedule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 items-center">
      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bulk Add Schedule</h1>
        <p className="text-slate-500 mb-6">Paste a JSON array of activities to initialize the project schedule.</p>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 text-sm text-green-800 bg-green-100 rounded-lg font-semibold">
            Schedule imported successfully! Redirecting to dashboard...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <textarea 
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={15}
              className="w-full p-4 font-mono text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-slate-50"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => router.push("/hq")} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded font-medium">Skip</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Importing..." : "Import Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
