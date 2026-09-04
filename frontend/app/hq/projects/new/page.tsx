"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/apiClient"

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      location_lat: parseFloat(formData.get("lat") as string) || 0,
      location_lng: parseFloat(formData.get("lng") as string) || 0,
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
    }

    try {
      const res = await apiClient.post("/api/projects", data)
      router.push(`/hq/projects/${res.data.id}/managers`)
    } catch (err: any) {
      setError(err.message || "Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 items-center">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Project</h1>
        
        {error && (
          <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
            <input name="name" required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="datetime-local" name="start_date" required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="datetime-local" name="end_date" required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
              <input type="number" step="any" name="lat" required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
              <input type="number" step="any" name="lng" required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Project & Next"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
