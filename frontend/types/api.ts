/**
 * FieldPulse AI — Frontend TypeScript Types
 *
 * CASING CONVENTION:
 *   - All types here use camelCase (TypeScript convention).
 *   - The backend JSON wire format uses snake_case.
 *   - The lib/api/ layer is responsible for transforming between the two using
 *     a `toCamel` / `toSnake` utility. Do NOT pass raw snake_case API responses
 *     directly into components — always go through the api layer.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = "site_engineer" | "project_manager" | "hq_admin" | "auditor" | "platform_admin";

export type MediaType = "photo" | "video" | "voice" | "qr" | "document";

export type CaptureStatus =
  | "processing"
  | "auto_approved"
  | "pending_review"
  | "approved"
  | "rejected"
  | "processing_failed";

export type ActivityStatus = "not_started" | "in_progress" | "completed" | "delayed";

export type ProjectStatus = "on_track" | "at_risk" | "delayed";

export type AlertType = "delay" | "critical_path" | "warning" | "info" | "critical";

// ---------------------------------------------------------------------------
// Shared / Primitives
// ---------------------------------------------------------------------------

/** GeoJSON Point — coordinates order is [longitude, latitude] */
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface OtpRequestBody {
  phone: string;
}

export interface OtpRequestResponse {
  message: string;
  otp?: string | null;
  mockMode?: boolean;
}

export interface OtpVerifyBody {
  phone: string;
  otp: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

/** Returned by /auth/otp/verify and /auth/login */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // "bearer"
  role: UserRole;
  userId: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  tokenType: string;
}

/** Returned by GET /me */
export interface CurrentUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  project_ids: string[];
  createdAt: string; // ISO datetime string
}

// ---------------------------------------------------------------------------
// AI / Classification sub-types
// ---------------------------------------------------------------------------

export interface CvClassification {
  label: string;
  confidence: number; // 0.0 – 1.0
}

export interface ExtractedEntities {
  activity: string;
  location: string;
  quantity: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

export interface Capture {
  id: string;
  userId: string;
  projectId: string;
  mediaType: MediaType;
  mediaUrl: string;
  gps: GeoPoint;
  qrCodeValue: string | null;
  transcribedText: string | null;
  extractedEntities: ExtractedEntities | null;
  cvClassification: CvClassification | null;
  matchedActivityId: string | null;
  confidenceScore: number; // 0.0 – 1.0
  status: CaptureStatus;
  rejectionReason: string | null;
  createdAt: string; // ISO datetime string
}

export interface CaptureListResponse {
  items: Capture[];
  total: number;
}

// ---------------------------------------------------------------------------
// Schedule Activity
// ---------------------------------------------------------------------------

export interface ScheduleActivity {
  id: string;
  projectId: string;
  activityCode: string;
  activityName: string;
  location: GeoPoint;
  plannedStart: string; // ISO datetime string
  plannedEnd: string; // ISO datetime string
  percentComplete: number; // 0 – 100
  status: ActivityStatus;
  keywords: string[];
  plannedQuantity?: number | null;
  quantityUnit?: string | null;
  dependencies?: string[];
  milestone?: string | null;
  criticalPath?: boolean;
  baselineStart?: string | null;
  baselineEnd?: string | null;
  baselineDurationDays?: number | null;
}

export interface ScheduleListResponse {
  items: ScheduleActivity[];
}

// ---------------------------------------------------------------------------
// AI Site Time Machine
// ---------------------------------------------------------------------------

export type TimelineEventType =
  | "ACTIVITY_CREATED"
  | "SCHEDULE_UPDATED"
  | "PROGRESS_UPDATE"
  | "PHOTO_CAPTURED"
  | "VIDEO_CAPTURED"
  | "VOICE_UPDATE"
  | "QR_SCAN"
  | "WORKER_UPDATE"
  | "EQUIPMENT_ISSUE"
  | "MATERIAL_ISSUE"
  | "SAFETY_ISSUE"
  | "WEATHER_DELAY"
  | "AI_DELAY_DETECTED"
  | "PM_APPROVED"
  | "PM_REJECTED"
  | "CORRECTIVE_ACTION_CREATED"
  | "CORRECTIVE_ACTION_RESOLVED"
  | "FORECAST_UPDATED"
  | "MILESTONE_RISK_CHANGED";

export interface TimelineEvent {
  id: string;
  projectId: string;
  activityId: string;
  eventType: TimelineEventType;
  timestamp: string; // ISO string
  sourceType: string;
  sourceId?: string | null;
  actorId?: string | null;
  description?: string | null;
  progressBefore?: number | null;
  progressAfter?: number | null;
  confidence?: number | null;
  evidenceIds?: string[];
  metadata?: Record<string, any>;
  integrityHash?: string | null;
  createdAt: string;
}

export interface ActivitySummary {
  id: string;
  projectId: string;
  activityCode: string;
  activityName: string;
  plannedProgress: number;
  actualProgress: number;
  plannedStart?: string | null;
  plannedFinish?: string | null;
  forecastFinish?: string | null;
  delayDays: number;
  scheduleVariance: number;
  risk: string; // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: string;
  dependencies?: string[];
  milestone?: string | null;
  criticalPath?: boolean;
  plannedQuantity?: number | null;
  quantityUnit?: string | null;
}

export interface ContributingFactor {
  cause: string;
  evidenceCount: number;
}

export interface RootCauseSummary {
  primaryCause: string;
  causeCode: string;
  confidence: number;
  explanation: string;
  supportingEventIds: string[];
  contributingFactors?: ContributingFactor[];
}

export interface AffectedActivity {
  activityId: string;
  activityCode: string;
  activityName: string;
  estimatedImpactDays: number;
  slackDays: number;
  criticalPath: boolean;
  plannedStart?: string | null;
  newForecastStart?: string | null;
}

export interface AffectedMilestone {
  milestoneId: string;
  milestoneName: string;
  risk: string;
  estimatedDelayDays: number;
}

export interface DownstreamImpactSummary {
  activityDelayDays: number;
  affectedActivities: AffectedActivity[];
  affectedMilestones: AffectedMilestone[];
  hasDownstreamImpact: boolean;
}

export interface PaginationMeta {
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
}

export interface ActivityTimelineResponse {
  activity: ActivitySummary;
  timeline: TimelineEvent[];
  rootCause: RootCauseSummary;
  downstreamImpact: DownstreamImpactSummary;
  pagination: PaginationMeta;
}

export interface AskQuestionResponse {
  answer: string;
  supportingEventIds: string[];
  confidence: number;
}

export interface EvidenceDetails {
  id: string;
  projectId: string;
  activityId?: string | null;
  mediaType: string;
  mediaUrl: string;
  gps?: GeoPoint | null;
  qrCodeValue?: string | null;
  transcribedText?: string | null;
  extractedEntities?: ExtractedEntities | null;
  cvClassification?: CvClassification | null;
  uploaderName?: string | null;
  uploaderRole?: string | null;
  createdAt: string;
  status: string;
  processingNotes?: string[];
}

export interface WsNewActivityEvent {
  projectId: string;
  activityId: string;
  eventType: string;
  eventId: string;
}

// ---------------------------------------------------------------------------
// Review Queue
// ---------------------------------------------------------------------------

export interface SubmittedBy {
  id: string;
  name: string;
}

export interface SuggestedActivity {
  id: string;
  activityCode: string;
  activityName: string;
}

/** Extends Capture with PM-specific join data */
export interface ReviewQueueItem extends Capture {
  submittedBy: SubmittedBy;
  suggestedActivity: SuggestedActivity | null;
}

export interface ReviewQueueListResponse {
  items: ReviewQueueItem[];
  total: number;
}

export interface ApproveBody {
  matchedActivityId: string;
  percentCompleteOverride: number | null;
}

export interface ApproveResponse {
  capture: Capture;
  activity: ScheduleActivity;
}

export interface RejectBody {
  reason: string;
}

export interface RejectResponse {
  capture: Capture;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface SCurveDataPoint {
  date: string; // "YYYY-MM-DD"
  plannedPercent: number;
  actualPercent: number;
}

export interface DashboardMetrics {
  projectId: string;
  projectName: string;
  overallPercentComplete: number;
  status: ProjectStatus;
  totalActivities: number;
  completedActivities: number;
  delayedActivities: number;
  sCurve: SCurveDataPoint[];
}

export interface ForecastDataPoint {
  date: string;
  forecastPercent: number;
}

export interface ForecastResponse {
  projectId: string;
  forecast: ForecastDataPoint[];
}

// ---------------------------------------------------------------------------
// Portfolio Dashboard
// ---------------------------------------------------------------------------

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  percentComplete: number;
  location: GeoPoint | null;
  pmName: string | null;
  lastActivityAt: string | null;
}

export interface PortfolioDashboard {
  totalProjects: number;
  onTrack: number;
  atRisk: number;
  delayed: number;
  overallPercentComplete: number;
  projects: ProjectSummary[];
}

// ---------------------------------------------------------------------------
// Alerts / Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  projectId: string;
  projectName?: string | null;
  activityId?: string | null;
  type: AlertType | string;
  title?: string | null;
  message: string;
  createdAt: string; // ISO datetime string
  readBy: string[]; // array of user IDs
}


export interface AlertListResponse {
  items: Notification[];
  total: number;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportExport {
  projectId: string;
  projectName: string;
  generatedAt: string; // ISO datetime string
  overallPercentComplete: number;
  activities: ScheduleActivity[];
  recentCaptures: Capture[];
  alerts: Notification[];
}

// ---------------------------------------------------------------------------
// WebSocket Event Payloads
// ---------------------------------------------------------------------------

export interface WsNewReviewItem {
  captureId: string;
  projectId: string;
}

export interface WsActivityUpdated {
  activityId: string;
  projectId: string;
  percentComplete: number;
}

export interface WsNewAlert {
  notificationId: string;
  projectId: string;
  type: AlertType;
}

// ---------------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------------

export interface ApiError {
  detail: string;
}
