export const API_ENDPOINTS = {
  auth: {
    otpRequest: '/api/auth/otp/request',
    otpVerify: '/api/auth/otp/verify',
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
  },
  activities: {
    nearby: '/api/activities/nearby',
    details: (id: string) => `/api/activities/${id}`,
    timeline: (id: string) => `/api/activities/${id}/timeline`,
    rootCause: (id: string) => `/api/activities/${id}/timeline/root-cause`,
    impact: (id: string) => `/api/activities/${id}/timeline/impact`,
    ask: (id: string) => `/api/activities/${id}/timeline/ask`,
    evidence: (activityId: string, evidenceId: string) => `/api/activities/${activityId}/evidence/${evidenceId}`,
  },
  captures: {
    submit: '/api/captures/',
    mine: '/api/captures/mine',
    details: (id: string) => `/api/captures/${id}`,
  },
  review: {
    queue: '/api/review-queue',
    approve: (id: string) => `/api/review-queue/${id}/approve`,
    reject: (id: string) => `/api/review-queue/${id}/reject`,
    reassign: (id: string) => `/api/review-queue/${id}/reassign`,
  },
  projects: {
    dashboard: (id: string) => `/api/projects/${id}/dashboard`,
    schedule: (id: string) => `/api/projects/${id}/schedule`,
  },
  portfolio: {
    dashboard: '/api/portfolio/dashboard',
    alerts: '/api/alerts',
  },
  reports: {
    export: (projectId: string) => `/api/reports/${projectId}/export`,
  },
};
