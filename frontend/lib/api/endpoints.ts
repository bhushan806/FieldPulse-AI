export const API_ENDPOINTS = {
  auth: {
    otpRequest: '/auth/otp/request',
    otpVerify: '/auth/otp/verify',
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/me',
  },
  activities: {
    nearby: '/activities/nearby',
    details: (id: string) => `/activities/${id}`,
  },
  captures: {
    submit: '/captures',
    mine: '/captures/mine',
    details: (id: string) => `/captures/${id}`,
  },
  review: {
    queue: '/review-queue',
    approve: (id: string) => `/review-queue/${id}/approve`,
    reject: (id: string) => `/review-queue/${id}/reject`,
    reassign: (id: string) => `/review-queue/${id}/reassign`,
  },
  projects: {
    dashboard: (id: string) => `/projects/${id}/dashboard`,
    schedule: (id: string) => `/projects/${id}/schedule`,
  },
  portfolio: {
    dashboard: '/portfolio/dashboard',
    alerts: '/alerts',
  },
  reports: {
    export: (projectId: string) => `/reports/${projectId}/export`,
  },
};
