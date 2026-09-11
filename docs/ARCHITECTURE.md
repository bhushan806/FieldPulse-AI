# FieldPulse AI - System Architecture

## 1. System Diagram

```text
+---------------------------------------------------------+
|                                                         |
|               Frontend (Next.js PWA)                    |
|  - React Hook Form + Zod, Zustand, TanStack Query       |
|  - Tailwind CSS, shadcn/ui, Recharts                    |
|  - react-webcam, html5-qrcode                           |
|  - Vercel Deployment                                    |
|                                                         |
+---------------------------+-----------------------------+
                            |
                            | HTTP / WebSocket
                            v
+---------------------------------------------------------+
|                                                         |
|                  Backend API (FastAPI)                  |
|  - JWT Auth (python-jose), bcrypt                       |
|  - Render/Railway Deployment                            |
|                                                         |
|  +---------------------------------------------------+  |
|  |                  AI Engine Module                 |  |
|  | - Vision (CLIP via HF/open_clip)                  |  |
|  | - Speech (Whisper via HF/faster-whisper)          |  |
|  | - NLP (Mistral-7B-Instruct via HF API)            |  |
|  | - Fusion Scoring (rapidfuzz)                      |  |
|  +------------------------+--------------------------+  |
|                           |                             |
+---------------------------+-----------------------------+
   |                        |                           |
   |                        |                           |
   v                        v                           v
+-------------+  +------------------------+  +-------------------+
| MongoDB     |  | HuggingFace API        |  | Cloudinary        |
| Atlas       |  | (Inference API)        |  | (Media Storage)   |
| (Motor)     |  +------------------------+  +-------------------+
+-------------+
```

## 2. Request Lifecycle (One Capture)

1. **Frontend Upload**: Site Engineer captures progress (photo/voice/QR) via the mobile-first web app and submits with GPS coordinates.
2. **Backend Receives**: FastAPI receives the multipart form data request.
3. **Media Storage**: The media file is uploaded to Cloudinary, which returns a secure URL.
4. **AI Engine Processing**:
   - **CV**: CLIP classifies the image against known construction stages.
   - **STT**: If voice, Whisper transcribes audio to text.
   - **NLP**: Mistral-7B-Instruct extracts entities (activity, location, quantity, status) from text/transcription.
5. **Fusion Scoring**: The AI engine uses a weighted formula to match the capture against nearby schedule activities.
6. **Decision Routing**:
   - **High Confidence**: Auto-updates the schedule activity.
   - **Medium/Uncertain Confidence**: Flags for Project Manager review.
   - **Low Confidence**: Auto-rejected.
7. **Audit Log**: The action/decision is recorded in the audit logs.
8. **Live Notification**: A WebSocket event notifies the PM dashboard of the new review item or progress update.

## 3. User Roles & Permission Matrix

| Feature / Action | site_engineer | project_manager | hq_admin | auditor |
| :--- | :---: | :---: | :---: | :---: |
| **Login Method** | Phone + OTP | Email + Password | Email + Password | Email + Password |
| **Capture Progress** | ✅ | ❌ | ❌ | ❌ |
| **Review/Approve Matches**| ❌ | ✅ (Assigned Projects)| ✅ (All Projects) | ❌ |
| **View Project Dashboard**| ❌ | ✅ (Assigned Projects)| ✅ (All Projects) | ✅ (All Projects) |
| **View Portfolio Dashboard**| ❌ | ❌ | ✅ | ✅ |
| **Edit Project/Schedule** | ❌ | ✅ (Assigned Projects)| ✅ (All Projects) | ❌ |
| **Export Reports** | ❌ | ✅ (Assigned Projects)| ✅ (All Projects) | ✅ (All Projects) |

*Note: The `auditor` role is strictly READ-ONLY and has no approve/reject/edit permissions anywhere in the system.*

## 4. Scope (MVP vs. Phase 2)

* **Voice capture**: Phase 2
* **QR capture**: Phase 2
* **WebSocket live-push**: Phase 2 (MVP will use polling fallback if time-constrained, to be confirmed in Phase 11)
* **Forecasting**: Phase 2
* **Report export** (PDF/Excel): Phase 2 (JSON summary only for MVP)
* **Duplicate detection**: Phase 2
