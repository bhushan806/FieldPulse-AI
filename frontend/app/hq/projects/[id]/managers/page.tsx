"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { apiClient } from "@/lib/apiClient"

export default function ProjectManagersPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [inviteToken, setInviteToken] = useState("")

  async function handleAddManager(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMsg("")
    setInviteToken("")

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
    }

    try {
      const res = await apiClient.post(`/api/projects/${projectId}/managers`, data)
      setSuccessMsg(res.data.message)
      setInviteToken(res.data.invite_token)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setError(err.message || "Failed to add manager")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 items-center">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Add Project Manager</h1>
        <p className="text-slate-500 mb-6">Invite a Project Manager to oversee this project.</p>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 text-sm text-green-800 bg-green-100 rounded-lg">
            <p className="font-semibold mb-2">{successMsg}</p>
            {inviteToken && (
              <div className="bg-white p-3 rounded border border-green-200 break-all font-mono text-xs">
                Invite Link (Demo):<br/>
                <a href={`/set-password?token=${inviteToken}`} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                  {`${window.location.origin}/set-password?token=${inviteToken}`}
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleAddManager} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Manager Name</label>
            <input name="name" required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Manager Email</label>
            <input type="email" name="email" required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="pt-4 flex justify-between">
            <button type="button" onClick={() => router.push(`/hq/projects/${projectId}/schedule`)} className="px-4 py-2 text-blue-600 bg-blue-50 rounded font-medium hover:bg-blue-100">
              Skip / Go to Schedule
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50">
              {loading ? "Adding..." : "Add Manager"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
