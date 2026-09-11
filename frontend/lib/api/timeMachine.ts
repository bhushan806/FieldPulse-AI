/**
 * frontend/lib/api/timeMachine.ts
 * API client functions for AI Site Time Machine.
 */
import { apiRequest } from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  ActivityTimelineResponse,
  RootCauseSummary,
  DownstreamImpactSummary,
  AskQuestionResponse,
  EvidenceDetails,
  ScheduleActivity,
} from '@/types/api';

export interface TimelineParams {
  from?: string;
  to?: string;
  eventType?: string;
  sourceType?: string;
  skip?: number;
  limit?: number;
}

/**
 * Fetch full reconstructed timeline for an activity with delay, root cause, and downstream impact.
 */
export async function getActivityTimeline(
  activityId: string,
  params?: TimelineParams,
): Promise<ActivityTimelineResponse> {
  return apiRequest<ActivityTimelineResponse>(API_ENDPOINTS.activities.timeline(activityId), {
    method: 'GET',
    params: params as Record<string, string | number | undefined>,
  });
}

/**
 * Fetch isolated root cause analysis for an activity.
 */
export async function getActivityRootCause(activityId: string): Promise<RootCauseSummary> {
  return apiRequest<RootCauseSummary>(API_ENDPOINTS.activities.rootCause(activityId), {
    method: 'GET',
  });
}

/**
 * Fetch schedule dependency downstream impact analysis for an activity.
 */
export async function getActivityImpact(activityId: string): Promise<DownstreamImpactSummary> {
  return apiRequest<DownstreamImpactSummary>(API_ENDPOINTS.activities.impact(activityId), {
    method: 'GET',
  });
}

/**
 * Evidence-grounded Q&A against the activity's historical timeline.
 */
export async function askTimeMachine(
  activityId: string,
  question: string,
): Promise<AskQuestionResponse> {
  return apiRequest<AskQuestionResponse>(API_ENDPOINTS.activities.ask(activityId), {
    method: 'POST',
    body: { question },
  });
}

/**
 * Fetch verified evidence details (photo, audio transcript, video, QR scan, issue).
 */
export async function getActivityEvidence(
  activityId: string,
  evidenceId: string,
): Promise<EvidenceDetails> {
  return apiRequest<EvidenceDetails>(API_ENDPOINTS.activities.evidence(activityId, evidenceId), {
    method: 'GET',
  });
}

/**
 * Fetch single activity details.
 */
export async function getActivityDetails(activityId: string): Promise<ScheduleActivity> {
  return apiRequest<ScheduleActivity>(API_ENDPOINTS.activities.details(activityId), {
    method: 'GET',
  });
}
