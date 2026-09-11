'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { ShieldAlert, AlertTriangle, Activity, LayoutDashboard, Globe } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listAlerts, listReviewQueue } from '@/lib/api/dashboard';

export default function AdminDashboardPage() {
  const { data: alertsData, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['adminAlerts'],
    queryFn: () => listAlerts(),
    refetchInterval: 15000,
  });

  const { data: reviewData, isLoading: isLoadingReview } = useQuery({
    queryKey: ['adminReviewQueue'],
    queryFn: () => listReviewQueue(),
    refetchInterval: 15000,
  });

  const totalAlerts = alertsData?.total ?? alertsData?.items?.length ?? 0;
  const pendingReviews = reviewData?.total ?? reviewData?.items?.length ?? 0;

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Platform Admin Dashboard"
        subtitle="System-wide overview and cross-role navigation."
        badge={{ label: 'Full Access', color: 'danger' }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-danger-bg text-danger flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-primary mb-1">System Healthy</h3>
          <p className="text-sm font-medium text-text-secondary">All services operational</p>
        </div>

        {/* KPI 2 */}
        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-warning-bg text-warning flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <Link href="/hq/alerts" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View All</Link>
          </div>
          <h3 className="text-3xl font-bold text-text-primary mb-1 tabular">
            {isLoadingAlerts ? '...' : totalAlerts}
          </h3>
          <p className="text-sm font-medium text-text-secondary">Active Portfolio Alerts</p>
        </div>

        {/* KPI 3 */}
        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <Link href="/pm/review-queue" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Go to Queue</Link>
          </div>
          <h3 className="text-3xl font-bold text-text-primary mb-1 tabular">
            {isLoadingReview ? '...' : pendingReviews}
          </h3>
          <p className="text-sm font-medium text-text-secondary">Pending Reviews</p>
        </div>
      </div>


      <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Role Emulation</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/pm/dashboard" className="card card-hover p-6 flex items-start gap-4 cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100 flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary mb-1">Project Manager View</h3>
            <p className="text-sm text-text-secondary leading-relaxed">Access the PM Dashboard to review schedules, team activities, and approve field data.</p>
          </div>
        </Link>
        <Link href="/hq/portfolio" className="card card-hover p-6 flex items-start gap-4 cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 flex-shrink-0">
            <Globe className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary mb-1">HQ Portfolio View</h3>
            <p className="text-sm text-text-secondary leading-relaxed">Access the HQ and Auditor views for multi-project metrics, alerts, and executive reporting.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
