# FieldPulse AI — API Contract

> **Binding contract**: Every endpoint implemented in the backend and every API call made by the frontend MUST match a row in this table exactly — path, method, and field names. Do not silently deviate.
>
> **Casing convention**: Backend JSON uses `snake_case`. The `lib/api/` layer on the frontend transforms between `snake_case` (wire) and `camelCase` (TypeScript types). See `frontend/types/api.ts` for all interfaces.

---

## Base URL

```
Development:  http://localhost:8000
Production:   https://<your-render-app>.onrender.com
```

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Endpoints

### AUTH

| Method | Endpoint | Roles | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| POST | `/auth/otp/request` | Public | `{ "phone": "string" }` | `{ "message": "string" }` |
| POST | `/auth/otp/verify` | Public | `{ "phone": "string", "otp": "string" }` | `{ "access_token": "string", "refresh_token": "string", "token_type": "bearer", "role": "string", "user_id": "string" }` |
| POST | `/auth/login` | Public | `{ "email": "string", "password": "string" }` | `{ "access_token": "string", "refresh_token": "string", "token_type": "bearer", "role": "string", "user_id": "string" }` |
| POST | `/auth/refresh` | Public | `{ "refresh_token": "string" }` | `{ "access_token": "string", "token_type": "bearer" }` |
| GET | `/me` | All authenticated | — | `{ "id": "string", "name": "string", "phone": "string \| null", "email": "string \| null", "role": "string", "project_ids": ["string"], "created_at": "datetime" }` |

---

### CAPTURES

| Method | Endpoint | Roles | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| POST | `/captures` | site_engineer | Multipart form: `file: File`, `lat: float`, `lng: float`, `qr_code_value?: string`, `text_note?: string` | `Capture` object (see schema below) |
| GET | `/captures/mine` | site_engineer | — | `{ "items": [Capture], "total": int }` |

**Capture schema (returned by both endpoints):**
```json
{
  "id": "string",
  "user_id": "string",
  "project_id": "string",
  "media_type": "photo | video | voice | qr",
  "media_url": "string",
  "gps": { "type": "Point", "coordinates": [lng, lat] },
  "qr_code_value": "string | null",
  "transcribed_text": "string | null",
  "extracted_entities": { "activity": "string", "location": "string", "quantity": "string", "status": "string" },
  "cv_classification": { "label": "string", "confidence": 0.0 },
  "matched_activity_id": "string | null",
  "confidence_score": 0.0,
  "status": "processing | auto_approved | pending_review | approved | rejected",
  "rejection_reason": "string | null",
  "created_at": "datetime"
}
```

---

### ACTIVITIES / SCHEDULE

| Method | Endpoint | Roles | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| GET | `/activities/nearby` | site_engineer | Query: `lat: float`, `lng: float` | `{ "items": [ScheduleActivity] }` |
| GET | `/projects/{project_id}/schedule` | project_manager, hq_admin, auditor | — | `{ "items": [ScheduleActivity] }` |

**ScheduleActivity schema:**
```json
{
  "id": "string",
  "project_id": "string",
  "activity_code": "string",
  "activity_name": "string",
  "location": { "type": "Point", "coordinates": [lng, lat] },
  "planned_start": "datetime",
  "planned_end": "datetime",
  "percent_complete": 0,
  "status": "not_started | in_progress | completed | delayed",
  "keywords": ["string"]
}
```

---

### REVIEW QUEUE

| Method | Endpoint | Roles | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| GET | `/review-queue` | project_manager, hq_admin | — | `{ "items": [ReviewQueueItem], "total": int }` |
| POST | `/review-queue/{capture_id}/approve` | project_manager, hq_admin | `{ "matched_activity_id": "string", "percent_complete_override": int \| null }` | `{ "capture": Capture, "activity": ScheduleActivity }` |
| POST | `/review-queue/{capture_id}/reject` | project_manager, hq_admin | `{ "reason": "string" }` | `{ "capture": Capture }` |

**ReviewQueueItem schema (extends Capture with join data):**
```json
{
  "id": "string",
  "user_id": "string",
  "project_id": "string",
  "media_type": "photo | video | voice | qr",
  "media_url": "string",
  "gps": { "type": "Point", "coordinates": [lng, lat] },
  "transcribed_text": "string | null",
  "extracted_entities": {},
  "cv_classification": {},
  "matched_activity_id": "string | null",
  "confidence_score": 0.0,
  "status": "pending_review",
  "created_at": "datetime",
  "submitted_by": { "id": "string", "name": "string" },
  "suggested_activity": { "id": "string", "activity_code": "string", "activity_name": "string" }
}
```

---

### DASHBOARDS

| Method | Endpoint | Roles | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| GET | `/projects/{project_id}/dashboard` | project_manager, hq_admin, auditor | — | `DashboardMetrics` object |
| GET | `/portfolio/dashboard` | hq_admin, auditor | — | `PortfolioDashboard` object |

**DashboardMetrics schema:**
```json
{
  "project_id": "string",
  "project_name": "string",
  "overall_percent_complete": 0.0,
  "status": "on_track | at_risk | delayed",
  "total_activities": 0,
  "completed_activities": 0,
  "delayed_activities": 0,
  "s_curve": [
    {
      "date": "YYYY-MM-DD",
      "planned_percent": 0.0,
      "actual_percent": 0.0
    }
  ]
}
```

**PortfolioDashboard schema:**
```json
{
  "total_projects": 0,
  "on_track": 0,
  "at_risk": 0,
  "delayed": 0,
  "overall_percent_complete": 0.0,
  "projects": [
    {
      "id": "string",
      "name": "string",
      "status": "on_track | at_risk | delayed",
      "percent_complete": 0.0,
      "location": {}
    }
  ]
}
```

---

### ALERTS

| Method | Endpoint | Roles | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| GET | `/alerts` | project_manager, hq_admin, auditor | Query: `project_id?: string`, `unread_only?: bool` | `{ "items": [Notification], "total": int }` |

**Notification schema:**
```json
{
  "id": "string",
  "project_id": "string",
  "activity_id": "string",
  "type": "delay | critical_path",
  "message": "string",
  "created_at": "datetime",
  "read_by": ["string"]
}
```

---

### REPORTS

| Method | Endpoint | Roles | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| GET | `/reports/{project_id}/export` | project_manager, hq_admin, auditor | Query: `format?: "json"` (PDF/Excel = Phase 2) | `ReportExport` object |

**ReportExport schema (MVP — JSON only):**
```json
{
  "project_id": "string",
  "project_name": "string",
  "generated_at": "datetime",
  "overall_percent_complete": 0.0,
  "activities": [ScheduleActivity],
  "recent_captures": [Capture],
  "alerts": [Notification]
}
```

---

### WEBSOCKET

| Event | Direction | Payload |
|-------|-----------|---------|
| `new_review_item` | Server → Client | `{ "capture_id": "string", "project_id": "string" }` |
| `activity_updated` | Server → Client | `{ "activity_id": "string", "project_id": "string", "percent_complete": 0 }` |
| `new_alert` | Server → Client | `{ "notification_id": "string", "project_id": "string", "type": "string" }` |

WebSocket namespace: `/ws/updates`

---

## Error Response Format

All errors follow this shape:
```json
{
  "detail": "string describing the error"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request / validation error |
| 401 | Missing or invalid token |
| 403 | Token valid but role not permitted |
| 404 | Resource not found |
| 422 | Pydantic validation error |
| 500 | Internal server error |
