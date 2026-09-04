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

export type MediaType = "photo" | "video" | "voice" | "qr";

export type CaptureStatus =
  | "processing"
  | "auto_approved"
  | "pending_review"
  | "approved"
  | "rejected";

export type ActivityStatus = "not_started" | "in_progress" | "completed" | "delayed";

export type ProjectStatus = "on_track" | "at_risk" | "delayed";

export type AlertType = "delay" | "critical_path";

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
  projectIds: string[];
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
}

export interface ScheduleListResponse {
  items: ScheduleActivity[];
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

// ---------------------------------------------------------------------------
// Portfolio Dashboard
// ---------------------------------------------------------------------------

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  percentComplete: number;
  location: GeoPoint | null;
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
  activityId: string;
  type: AlertType;
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
