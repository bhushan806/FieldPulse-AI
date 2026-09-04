/**
 * frontend/lib/api/dashboard.ts
 * Dashboard, schedule, review-queue, alerts, and reports API calls.
 */
import { apiRequest } from "@/lib/apiClient";
import type {
  AlertListResponse,
  ApproveBody,
  ApproveResponse,
  DashboardMetrics,
  PortfolioDashboard,
  RejectBody,
  RejectResponse,
  ReportExport,
  ReviewQueueListResponse,
  ScheduleListResponse,
} from "@/types/api";

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function getProjectDashboard(projectId: string): Promise<DashboardMetrics> {
  return apiRequest<DashboardMetrics>(`/api/dashboard/${projectId}`);
}

export async function getPortfolioDashboard(): Promise<PortfolioDashboard> {
  return apiRequest<PortfolioDashboard>("/api/dashboard/portfolio");
}

// ── Schedule ───────────────────────────────────────────────────────────────

export async function listActivities(projectId: string): Promise<ScheduleListResponse> {
  return apiRequest<ScheduleListResponse>(`/api/schedule/?project_id=${projectId}`);
}

// ── Review Queue ───────────────────────────────────────────────────────────

export async function listReviewQueue(params?: {
  projectId?: string;
  skip?: number;
  limit?: number;
}): Promise<ReviewQueueListResponse> {
  const qs = new URLSearchParams();
  if (params?.projectId) qs.set("project_id", params.projectId);
  if (params?.skip != null) qs.set("skip", String(params.skip));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  return apiRequest<ReviewQueueListResponse>(`/api/review-queue/?${qs}`);
}

export async function approveCapture(
  captureId: string,
  body: ApproveBody
): Promise<ApproveResponse> {
  return apiRequest<ApproveResponse>(`/api/review-queue/${captureId}/approve`, {
    method: "POST",
    body,
  });
}

export async function rejectCapture(
  captureId: string,
  body: RejectBody
): Promise<RejectResponse> {
  return apiRequest<RejectResponse>(`/api/review-queue/${captureId}/reject`, {
    method: "POST",
    body,
  });
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export async function listAlerts(projectId?: string): Promise<AlertListResponse> {
  const qs = projectId ? `?project_id=${projectId}` : "";
  return apiRequest<AlertListResponse>(`/api/alerts/${qs}`);
}

export async function markAlertRead(notificationId: string): Promise<void> {
  return apiRequest<void>(`/api/alerts/${notificationId}/read`, { method: "POST" });
}

// ── Reports ────────────────────────────────────────────────────────────────

export async function exportReport(projectId: string): Promise<ReportExport> {
  return apiRequest<ReportExport>(`/api/reports/${projectId}`);
}
