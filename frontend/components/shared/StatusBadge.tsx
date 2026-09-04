"use client";

import { clsx } from "clsx";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Loader2,
  CheckSquare,
  XCircle,
  CircleDashed,
  PlayCircle
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  on_track: { label: "On Track", icon: CheckCircle2 },
  at_risk: { label: "At Risk", icon: AlertTriangle },
  delayed: { label: "Delayed", icon: Clock },
  processing: { label: "Processing", icon: Loader2 },
  auto_approved: { label: "Auto Approved", icon: CheckSquare },
  pending_review: { label: "Pending Review", icon: Activity },
  approved: { label: "Approved", icon: CheckCircle2 },
  rejected: { label: "Rejected", icon: XCircle },
  not_started: { label: "Not Started", icon: CircleDashed },
  planned: { label: "Planned", icon: CircleDashed },
  in_progress: { label: "In Progress", icon: PlayCircle },
  completed: { label: "Completed", icon: CheckCircle2 },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, icon: Activity };
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        `status-${status.replace('_', '')}`,
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border",
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
