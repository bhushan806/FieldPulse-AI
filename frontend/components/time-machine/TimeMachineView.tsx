'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Camera,
  Mic,
  Video,
  QrCode,
  TrendingUp,
  Wrench,
  Package,
  CloudRain,
  ShieldAlert,
  PlusCircle,
  CalendarDays,
  Bot,
  CheckCheck,
  Send,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  GitCommit,
  Layers,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

import {
  getActivityDetails,
  getActivityTimeline,
  getActivityRootCause,
  getActivityImpact,
  askTimeMachine,
} from '@/lib/api/timeMachine';
import {
  TimelineEvent,
  TimelineEventType,
  AskQuestionResponse,
} from '@/types/api';
import { socket } from '@/lib/socket';
import { EvidenceViewerModal } from './EvidenceViewerModal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

interface TimeMachineViewProps {
  activityId: string;
  backHref?: string;
}

export function TimeMachineView({ activityId, backHref = '/pm/schedule' }: TimeMachineViewProps) {
  const queryClient = useQueryClient();

  // Filters & local state
  const [filterType, setFilterType] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedEvidence, setSelectedEvidence] = useState<{ id: string | null; event: TimelineEvent | null } | null>(null);
  
  // Ask Time Machine State
  const [questionInput, setQuestionInput] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; response: AskQuestionResponse }>>([]);

  // 1. Fetch Activity Details
  const {
    data: activity,
    isLoading: isActivityLoading,
    isError: isActivityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['activityDetails', activityId],
    queryFn: () => getActivityDetails(activityId),
    staleTime: 10000,
  });

  // Calculate ISO start date filter based on preset
  const filterStartDate = useMemo(() => {
    if (datePreset === 'ALL') return undefined;
    const now = new Date();
    const days = datePreset === '7D' ? 7 : datePreset === '14D' ? 14 : 30;
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return past.toISOString();
  }, [datePreset]);

  // Map high-level UI filter to eventType param
  const filterEventTypeParam = useMemo(() => {
    if (filterType === 'ALL') return undefined;
    return filterType;
  }, [filterType]);

  // 2. Fetch Activity Timeline
  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    refetch: refetchTimeline,
  } = useQuery({
    queryKey: ['activityTimeline', activityId, filterEventTypeParam, filterStartDate],
    queryFn: () =>
      getActivityTimeline(activityId, {
        eventType: filterEventTypeParam !== 'ALL' ? filterEventTypeParam : undefined,
        from: filterStartDate,
        limit: 100,
      }),
    staleTime: 5000,
  });

  // 3. Fetch Root Cause
  const {
    data: rootCause,
    isLoading: isRootCauseLoading,
    refetch: refetchRootCause,
  } = useQuery({
    queryKey: ['activityRootCause', activityId],
    queryFn: () => getActivityRootCause(activityId),
    staleTime: 15000,
  });

  // 4. Fetch Downstream Impact
  const {
    data: impact,
    isLoading: isImpactLoading,
    refetch: refetchImpact,
  } = useQuery({
    queryKey: ['activityImpact', activityId],
    queryFn: () => getActivityImpact(activityId),
    staleTime: 15000,
  });

  // 5. Ask Question Mutation
  const askMutation = useMutation({
    mutationFn: (q: string) => askTimeMachine(activityId, q),
    onSuccess: (data: AskQuestionResponse, variables: string) => {
      setQaHistory((prev) => [{ question: variables, response: data }, ...prev]);
      setQuestionInput('');
    },
  });

  const handleAskSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionInput.trim() || askMutation.isPending) return;
    askMutation.mutate(questionInput.trim());
  };

  // 6. WebSocket Live Listener
  useEffect(() => {
    if (!activity?.projectId) return;

    const handleNewEvent = (data: any) => {
      if (data && (data.activity_id === activityId || data.activityId === activityId)) {
        queryClient.invalidateQueries({ queryKey: ['activityTimeline', activityId] });
        queryClient.invalidateQueries({ queryKey: ['activityRootCause', activityId] });
        queryClient.invalidateQueries({ queryKey: ['activityImpact', activityId] });
        queryClient.invalidateQueries({ queryKey: ['activityDetails', activityId] });
      }
    };

    socket.connect(activity.projectId);
    socket.on('new_activity_event', handleNewEvent);

    return () => {
      socket.off('new_activity_event', handleNewEvent);
    };
  }, [activity?.projectId, activityId, queryClient]);

  // Sort events
  const sortedEvents = useMemo(() => {
    if (!timelineData?.timeline) return [];
    const list = [...timelineData.timeline];
    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [timelineData?.timeline, sortOrder]);

  // Group events by human-friendly date
  const groupedEvents = useMemo(() => {
    const groups: { [dateStr: string]: TimelineEvent[] } = {};
    for (const evt of sortedEvents) {
      const d = new Date(evt.timestamp);
      const dateKey = d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(evt);
    }
    return Object.entries(groups);
  }, [sortedEvents]);

  // Helper for event icons and styles
  const getEventMeta = (type: TimelineEventType) => {
    switch (type) {
      case 'PHOTO_CAPTURED':
        return {
          icon: Camera,
          label: 'Photo Captured',
          color: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300',
          dot: 'bg-sky-500 ring-sky-100 dark:ring-sky-950',
        };
      case 'VOICE_UPDATE':
        return {
          icon: Mic,
          label: 'Voice Note',
          color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300',
          dot: 'bg-purple-500 ring-purple-100 dark:ring-purple-950',
        };
      case 'VIDEO_CAPTURED':
        return {
          icon: Video,
          label: 'Video Clip',
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300',
          dot: 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-950',
        };
      case 'QR_SCAN':
        return {
          icon: QrCode,
          label: 'QR Scan',
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
          dot: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-950',
        };
      case 'PROGRESS_UPDATE':
        return {
          icon: TrendingUp,
          label: 'Progress Update',
          color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300',
          dot: 'bg-green-500 ring-green-100 dark:ring-green-950',
        };
      case 'PM_APPROVED':
        return {
          icon: CheckCircle2,
          label: 'PM Approved',
          color: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300',
          dot: 'bg-teal-500 ring-teal-100 dark:ring-teal-950',
        };
      case 'PM_REJECTED':
        return {
          icon: XCircle,
          label: 'PM Rejected',
          color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300',
          dot: 'bg-rose-500 ring-rose-100 dark:ring-rose-950',
        };
      case 'EQUIPMENT_ISSUE':
        return {
          icon: Wrench,
          label: 'Equipment Issue',
          color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
          dot: 'bg-amber-500 ring-amber-100 dark:ring-amber-950',
        };
      case 'MATERIAL_ISSUE':
        return {
          icon: Package,
          label: 'Material Issue',
          color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300',
          dot: 'bg-orange-500 ring-orange-100 dark:ring-orange-950',
        };
      case 'WEATHER_DELAY':
        return {
          icon: CloudRain,
          label: 'Weather Delay',
          color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300',
          dot: 'bg-blue-500 ring-blue-100 dark:ring-blue-950',
        };
      case 'SAFETY_ISSUE':
        return {
          icon: ShieldAlert,
          label: 'Safety Incident',
          color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300',
          dot: 'bg-red-500 ring-red-100 dark:ring-red-950',
        };
      case 'CORRECTIVE_ACTION_RESOLVED':
        return {
          icon: CheckCheck,
          label: 'Issue Resolved',
          color: 'text-emerald-700 bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200',
          dot: 'bg-emerald-600 ring-emerald-200 dark:ring-emerald-900',
        };
      case 'ACTIVITY_CREATED':
        return {
          icon: PlusCircle,
          label: 'Activity Created',
          color: 'text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
          dot: 'bg-slate-500 ring-slate-200 dark:ring-slate-800',
        };
      case 'SCHEDULE_UPDATED':
        return {
          icon: CalendarDays,
          label: 'Schedule Updated',
          color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300',
          dot: 'bg-blue-600 ring-blue-100 dark:ring-blue-950',
        };
      case 'AI_DELAY_DETECTED':
        return {
          icon: Bot,
          label: 'AI Delay Alert',
          color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300',
          dot: 'bg-rose-600 ring-rose-100 dark:ring-rose-950',
        };
      default:
        return {
          icon: Layers,
          label: type,
          color: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300',
          dot: 'bg-gray-500 ring-gray-100 dark:ring-gray-800',
        };
    }
  };

  if (isActivityLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size={44} />
        <p className="text-sm font-medium text-text-secondary animate-pulse">
          Reconstructing Time Machine history from field evidence...
        </p>
      </div>
    );
  }

  if (isActivityError || !activity) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-12 h-12 text-danger mb-3" />
        <h2 className="text-xl font-bold text-text-primary">Activity Not Found</h2>
        <p className="text-sm text-text-secondary mt-1 mb-6 text-center max-w-md">
          Could not retrieve the requested construction activity or authorization was denied.
        </p>
        <Link
          href={backHref}
          className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition"
        >
          Back to Schedule
        </Link>
      </div>
    );
  }

  // Delay & Risk metrics from activity summary
  const delayDays = timelineData?.activity?.delayDays ?? 0;
  const isDelayed = delayDays > 0;
  const riskLevel = timelineData?.activity?.risk || (isDelayed ? (delayDays > 5 ? 'CRITICAL' : 'HIGH') : 'LOW');

  const riskBadgeClass: Record<string, string> = {
    LOW: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    MEDIUM: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
    CRITICAL: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 animate-pulse',
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="p-2 rounded-xl border border-border bg-card hover:bg-bg-muted transition text-text-secondary hover:text-text-primary shadow-sm"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border border-border bg-bg-muted text-text-secondary">
                {activity.activityCode}
              </span>
              {activity.milestone && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  ★ Milestone
                </span>
              )}
              {activity.criticalPath && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  Critical Path
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight mt-1 flex items-center gap-2">
              <span>{activity.activityName}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time Machine
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => {
              refetchActivity();
              refetchTimeline();
              refetchRootCause();
              refetchImpact();
            }}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-bg-muted transition text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="Refresh evidence"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI & Timeline Header Card */}
      <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Progress */}
          <div className="p-4 rounded-xl bg-bg-muted/50 border border-border/80">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Progress</span>
            <div className="text-2xl font-black text-text-primary mt-1 flex items-baseline gap-1">
              <span>{activity.percentComplete}%</span>
              <span className="text-xs font-normal text-text-muted">done</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDelayed ? 'bg-danger' : 'bg-brand-500'
                }`}
                style={{ width: `${Math.min(100, activity.percentComplete)}%` }}
              />
            </div>
          </div>

          {/* Planned vs Forecast Dates */}
          <div className="p-4 rounded-xl bg-bg-muted/50 border border-border/80">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Planned Finish</span>
            <div className="text-base font-bold text-text-primary mt-1">
              {activity.plannedEnd
                ? new Date(activity.plannedEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Not Set'}
            </div>
            <div className="text-xs text-text-muted mt-2">
              Forecast:{' '}
              <span className={`font-semibold ${isDelayed ? 'text-danger' : 'text-text-primary'}`}>
                {timelineData?.activity?.forecastFinish
                  ? new Date(timelineData.activity.forecastFinish).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'On Schedule'}
              </span>
            </div>
          </div>

          {/* Delay Slip */}
          <div className="p-4 rounded-xl bg-bg-muted/50 border border-border/80">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Schedule Slip</span>
            <div className={`text-2xl font-black mt-1 ${isDelayed ? 'text-danger' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isDelayed ? `+${delayDays}d behind` : 'On Track'}
            </div>
            <div className="text-xs text-text-muted mt-2 flex items-center gap-1">
              <span>Planned:</span>
              <span className="font-mono font-semibold">
                {timelineData?.activity?.plannedProgress !== undefined ? `${timelineData.activity.plannedProgress}%` : '-'}
              </span>
            </div>
          </div>

          {/* Risk Level */}
          <div className="p-4 rounded-xl bg-bg-muted/50 border border-border/80 flex flex-col justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">AI Risk Assessment</span>
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide uppercase border ${riskBadgeClass[riskLevel] || riskBadgeClass['LOW']}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {riskLevel} RISK
              </span>
            </div>
            <div className="text-[11px] text-text-muted mt-2">
              {timelineData?.pagination?.total ?? sortedEvents.length} verified events
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Root Cause Explanation & Downstream Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* "Why is it delayed?" Root Cause Card */}
        <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-text-primary tracking-tight">
                  Why is this Activity Delayed?
                </h2>
              </div>
              {rootCause?.confidence !== undefined && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-bg-muted border border-border text-text-secondary">
                  Confidence: {Math.round(rootCause.confidence * 100)}%
                </span>
              )}
            </div>

            {isRootCauseLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-text-muted text-sm">
                <LoadingSpinner size={20} />
                <span>Correlating field issues and site evidence...</span>
              </div>
            ) : rootCause ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-muted/70 border border-border/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 border border-brand-500/20">
                      Primary Cause: {rootCause.primaryCause.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-primary leading-relaxed">
                    {rootCause.explanation}
                  </p>
                </div>

                {rootCause.contributingFactors && rootCause.contributingFactors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Contributing Factors
                    </h4>
                    <ul className="space-y-1.5">
                      {rootCause.contributingFactors.map((factor, idx) => (
                        <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                          <span>
                            {factor.cause.replace(/_/g, ' ')} ({factor.evidenceCount} records)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {rootCause.supportingEventIds && rootCause.supportingEventIds.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Supporting Evidence References
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {rootCause.supportingEventIds.map((evtId) => (
                        <button
                          key={evtId}
                          onClick={() => setSelectedEvidence({ id: evtId, event: null })}
                          className="px-2 py-1 rounded-md bg-card border border-border text-[11px] font-mono text-text-secondary hover:text-brand-600 hover:border-brand-500 transition flex items-center gap-1"
                        >
                          <span>#{evtId.slice(-6)}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic py-4">
                No delay root cause detected. Activity is progressing according to baseline.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-text-muted flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
            <span>Grounded directly in timestamped site records and worker submissions.</span>
          </div>
        </div>

        {/* Downstream Impact Analysis Card */}
        <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <GitCommit className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-text-primary tracking-tight">
                  Predicted Downstream Impact
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                {impact?.activityDelayDays ? `+${impact.activityDelayDays}d Delay` : 'No Critical Slip'}
              </span>
            </div>

            {isImpactLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-text-muted text-sm">
                <LoadingSpinner size={20} />
                <span>Simulating schedule dependency tree...</span>
              </div>
            ) : impact ? (
              <div className="space-y-4">
                {impact.affectedActivities && impact.affectedActivities.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Affected Successor Activities ({impact.affectedActivities.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {impact.affectedActivities.map((succ) => (
                        <div
                          key={succ.activityId}
                          className="p-2.5 rounded-xl border border-border bg-bg-muted/40 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-text-primary">
                                {succ.activityCode}
                              </span>
                              <span className="text-text-secondary font-medium truncate max-w-[180px] sm:max-w-[240px]">
                                {succ.activityName}
                              </span>
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5">
                              Slack: <span className="font-semibold">{succ.slackDays}d</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-danger font-mono">
                              +{succ.estimatedImpactDays}d slip
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic py-2">
                    No successor activities are projected to suffer schedule slip.
                  </p>
                )}

                {/* Milestones At Risk */}
                {impact.affectedMilestones && impact.affectedMilestones.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2">
                      Milestones At Risk
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {impact.affectedMilestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{m.milestoneName}</span>
                          <span className="font-mono text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded">
                            +{m.estimatedDelayDays}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic py-4">
                Schedule network analysis complete. No downstream risks detected.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-text-muted flex items-center justify-between">
            <span>Critical path buffer calculations updated in real-time.</span>
          </div>
        </div>
      </div>

      {/* Ask Time Machine Interactive Panel */}
      <div className="card p-6 bg-gradient-to-br from-card to-brand-500/5 border border-brand-500/20 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                Ask Time Machine
              </h2>
              <p className="text-xs text-text-secondary">
                Query this activity&apos;s history using deterministic evidence matching.
              </p>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            'Why is this activity delayed?',
            'What evidence was submitted for this activity?',
            'Are there unresolved equipment or material issues?',
            'Who reviewed and approved recent progress?',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuestionInput(prompt);
                askMutation.mutate(prompt);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-brand-500 hover:text-brand-600 text-text-secondary transition shadow-2xs font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Question Form */}
        <form onSubmit={handleAskSubmit} className="flex gap-2">
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask about this activity's history, delay causes, or proof..."
            className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
          />
          <button
            type="submit"
            disabled={!questionInput.trim() || askMutation.isPending}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
          >
            {askMutation.isPending ? (
              <LoadingSpinner size={16} />
            ) : (
              <>
                <span>Ask</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Q&A History Stream */}
        {qaHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            {qaHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-2 animate-in fade-in"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{item.question}</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {item.response.answer}
                </p>
                {item.response.supportingEventIds && item.response.supportingEventIds.length > 0 && (
                  <div className="pt-2 border-t border-border/60 flex items-center gap-2 flex-wrap text-xs text-text-muted">
                    <span className="font-semibold">Supporting Events:</span>
                    {item.response.supportingEventIds.map((evtId: string, cIdx: number) => (
                      <button
                        key={cIdx}
                        onClick={() =>
                          setSelectedEvidence({
                            id: evtId,
                            event: null,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-bg-muted border border-border hover:border-brand-500 text-[11px] font-mono text-text-secondary flex items-center gap-1"
                      >
                        <span>#{evtId.slice(-6)}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
        <div>
          <h2 className="text-xl font-black text-text-primary tracking-tight flex items-center gap-2">
            <span>Historical Evidence Stream</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-bg-muted text-text-secondary border border-border">
              {sortedEvents.length} events
            </span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Tamper-evident record authenticated via SHA-256 audit chain.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Event Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filter events by type"
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-500 shadow-sm cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              <option value="PHOTO_CAPTURED">Photos</option>
              <option value="VOICE_UPDATE">Voice Notes</option>
              <option value="VIDEO_CAPTURED">Videos</option>
              <option value="QR_SCAN">QR Scans</option>
              <option value="PROGRESS_UPDATE">Progress Updates</option>
              <option value="PM_APPROVED">PM Approvals</option>
              <option value="PM_REJECTED">PM Rejections</option>
              <option value="EQUIPMENT_ISSUE">Equipment Issues</option>
              <option value="MATERIAL_ISSUE">Material Issues</option>
              <option value="WEATHER_DELAY">Weather Delays</option>
              <option value="SAFETY_ISSUE">Safety Incidents</option>
              <option value="AI_DELAY_DETECTED">AI Delay Alerts</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              aria-label="Filter events by date range"
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-500 shadow-sm cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="7D">Past 7 Days</option>
              <option value="14D">Past 14 Days</option>
              <option value="30D">Past 30 Days</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="p-2 rounded-xl border border-border bg-card hover:bg-bg-muted text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 shadow-sm"
            title={`Sorting: ${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Chronological Timeline Flow */}
      {isTimelineLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size={36} />
          <p className="text-sm font-medium text-text-secondary">Loading activity timeline...</p>
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="card p-12 bg-card border border-border rounded-2xl shadow-sm text-center">
          <EmptyState
            icon={Clock}
            title="No historical evidence recorded yet"
            description="As field workers capture photos, log voice updates, report equipment issues, or PMs review progress, verifiable events will automatically populate here."
          />
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-border/80 ml-4 sm:ml-6 space-y-8">
          {groupedEvents.map(([dateString, eventsInDay]) => (
            <div key={dateString} className="space-y-4">
              {/* Date Group Header */}
              <div className="sticky top-16 z-10 bg-bg/95 backdrop-blur-sm -ml-10 sm:-ml-12 inline-flex items-center gap-2 py-1 px-3 rounded-full border border-border bg-card shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-xs font-bold text-text-primary tracking-wide">
                  {dateString}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  ({eventsInDay.length})
                </span>
              </div>

              {/* Events in this Day */}
              <div className="space-y-4">
                {eventsInDay.map((event) => {
                  const meta = getEventMeta(event.eventType);
                  const Icon = meta.icon;
                  const timeFormatted = new Date(event.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={event.id}
                      className="group relative bg-card border border-border hover:border-brand-500/50 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[31px] sm:-left-[39px] top-6 w-3.5 h-3.5 rounded-full ring-4 ${meta.dot}`}
                      />

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`p-2 rounded-xl border flex items-center justify-center ${meta.color}`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                                {meta.label}
                              </span>
                              <span className="text-xs text-text-muted font-medium">
                                • {timeFormatted}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-text-primary mt-0.5">
                              {event.eventType.replace(/_/g, ' ')}
                            </h3>
                          </div>
                        </div>

                        {/* Progress Delta or Badge */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {event.progressBefore !== null &&
                            event.progressBefore !== undefined &&
                            event.progressAfter !== null &&
                            event.progressAfter !== undefined && (
                              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>
                                  {event.progressBefore}% → {event.progressAfter}%
                                </span>
                              </div>
                            )}

                          {(event.sourceId || (event.evidenceIds && event.evidenceIds.length > 0)) && (
                            <button
                              onClick={() =>
                                setSelectedEvidence({
                                  id: event.sourceId || (event.evidenceIds && event.evidenceIds[0]) || null,
                                  event: event,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg border border-border bg-bg-muted hover:bg-card hover:border-brand-500 text-xs font-semibold text-text-secondary hover:text-brand-600 transition flex items-center gap-1"
                            >
                              <span>View Evidence</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description / Transcripts */}
                      {event.description && (
                        <p className="text-sm text-text-secondary leading-relaxed mb-3">
                          {event.description}
                        </p>
                      )}

                      {/* Event Metadata Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs text-text-muted">
                        {event.actorId && (
                          <span className="flex items-center gap-1 font-medium text-text-secondary">
                            <span>Actor:</span>
                            <span className="font-mono text-[11px] font-semibold text-text-primary">
                              {event.actorId.slice(-6)}
                            </span>
                          </span>
                        )}

                        {event.confidence !== null && event.confidence !== undefined && (
                          <span className="text-brand-600 font-semibold text-[11px]">
                            Conf: {Math.round(event.confidence * 100)}%
                          </span>
                        )}

                        {event.metadata && (
                          <>
                            {event.metadata.delay_days && (
                              <span className="text-danger font-semibold">
                                Delay: +{event.metadata.delay_days}d
                              </span>
                            )}
                            {event.metadata.severity && (
                              <span className="text-amber-600 font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                {event.metadata.severity}
                              </span>
                            )}
                          </>
                        )}

                        {/* Tamper Evident SHA-256 Hash */}
                        {event.integrityHash && (
                          <div
                            className="ml-auto flex items-center gap-1 text-[11px] font-mono text-text-muted/80"
                            title={`SHA-256 Audit Hash: ${event.integrityHash}`}
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>sha256:{event.integrityHash.slice(0, 8)}...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Viewer Modal */}
      {selectedEvidence && (
        <EvidenceViewerModal
          activityId={activityId}
          evidenceId={selectedEvidence.id}
          event={selectedEvidence.event}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  );
}
