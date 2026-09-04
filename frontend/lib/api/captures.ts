/**
 * frontend/lib/api/captures.ts
 * Capture submission and retrieval API calls.
 */
import { apiRequest } from "@/lib/apiClient";
import type { Capture, CaptureListResponse } from "@/types/api";

export async function submitCapture(formData: FormData): Promise<Capture> {
  return apiRequest<Capture>("/api/captures/", {
    method: "POST",
    body: formData,
  });
}

export async function listCaptures(params: {
  projectId?: string;
  statusFilter?: string;
  skip?: number;
  limit?: number;
}): Promise<CaptureListResponse> {
  const qs = new URLSearchParams();
  if (params.projectId) qs.set("project_id", params.projectId);
  if (params.statusFilter) qs.set("status_filter", params.statusFilter);
  if (params.skip != null) qs.set("skip", String(params.skip));
  if (params.limit != null) qs.set("limit", String(params.limit));
  return apiRequest<CaptureListResponse>(`/api/captures/?${qs}`);
}

export async function getCapture(captureId: string): Promise<Capture> {
  return apiRequest<Capture>(`/api/captures/${captureId}`);
}
