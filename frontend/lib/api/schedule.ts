/**
 * frontend/lib/api/schedule.ts
 * Schedule activity API calls.
 */
import { apiRequest } from "@/lib/apiClient";
import type { ScheduleActivity, ScheduleListResponse } from "@/types/api";

export async function listActivities(projectId: string): Promise<ScheduleListResponse> {
  return apiRequest<ScheduleListResponse>(`/api/schedule/?project_id=${projectId}`);
}

export async function createActivity(data: {
  projectId: string;
  activityCode: string;
  activityName: string;
  plannedStart: string;
  plannedEnd: string;
  keywords?: string[];
  locationLat?: number;
  locationLng?: number;
}): Promise<ScheduleActivity> {
  return apiRequest<ScheduleActivity>("/api/schedule/", { method: "POST", body: data });
}

export async function updateActivity(
  activityId: string,
  data: Partial<{
    activityName: string;
    plannedStart: string;
    plannedEnd: string;
    percentComplete: number;
    status: string;
    keywords: string[];
  }>
): Promise<ScheduleActivity> {
  return apiRequest<ScheduleActivity>(`/api/schedule/${activityId}`, {
    method: "PUT",
    body: data,
  });
}
