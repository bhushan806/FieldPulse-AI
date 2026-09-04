"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/apiClient"

export default function RosterPage() {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  
  const [engineers, setEngineers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Fetch PM's projects to get the active project ID (assuming they only have one for now or just take the first)
    async function load() {
      try {
        const me = await apiClient.get("/api/auth/me")
        if (me.data.project_ids && me.data.project_ids.length > 0) {
          const pid = me.data.project_ids[0]
          setProjectId(pid)
          const rosterRes = await apiClient.get(`/api/projects/${pid}/roster`)
          setEngineers(rosterRes.data.engineers || [])
        } else {
          setError("You don't have any projects assigned yet.")
        }
      } catch (err: any) {
        setError(err.message || "Failed to load roster")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!projectId) return

    setActionLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const data = {
      phone: formData.get("phone") as string,
      name: formData.get("name") as string,
    }

    try {
      const res = await apiClient.post(`/api/projects/${projectId}/engineers`, data)
      setEngineers([...engineers, res.data.entry])
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setError(err.message || "Failed to add engineer")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemove(phone: string) {
    if (!projectId) return
    if (!confirm(`Are you sure you want to remove ${phone} from the project?`)) return

    setActionLoading(true)
    setError("")
    try {
      await apiClient.delete(`/api/projects/${projectId}/roster/${encodeURIComponent(phone)}`)
      setEngineers(engineers.filter(e => e.phone !== phone))
    } catch (err: any) {
      setError(err.message || "Failed to remove engineer")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading roster...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Engineer Roster</h1>
            <p className="text-slate-500 mt-1">Manage field engineers with access to your project.</p>
          </div>
          <button onClick={() => router.push("/pm")} className="text-blue-600 font-medium hover:underline">
            &larr; Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 text-sm text-red-800 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Add Engineer Form */}
          <div className="col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Engineer</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input name="name" required placeholder="John Doe" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input name="phone" required placeholder="+919876543210" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-slate-500 mt-1">Must include country code.</p>
                </div>
                <button type="submit" disabled={actionLoading || !projectId} className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? "Adding..." : "Add to Roster"}
                </button>
              </form>
            </div>
          </div>

          {/* Roster List */}
          <div className="col-span-1 md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-sm font-semibold text-slate-600">Name</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">Phone</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                    <th className="p-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {engineers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        No engineers in the roster yet.
                      </td>
                    </tr>
                  ) : (
                    engineers.map((eng, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-900">{eng.name}</td>
                        <td className="p-4 text-slate-600 font-mono text-sm">{eng.phone}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${
                            eng.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {eng.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleRemove(eng.phone)}
                            disabled={actionLoading}
                            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
