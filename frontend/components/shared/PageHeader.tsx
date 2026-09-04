'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ElementType;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ElementType;
  };
  badge?: {
    label: string;
    color: 'brand' | 'warning' | 'danger' | 'success';
  };
}

const badgeClasses: Record<string, string> = {
  brand:   'bg-brand-50 text-brand-600 border border-brand-100',
  warning: 'bg-warning-bg text-warning border border-yellow-200',
  danger:  'bg-danger-bg text-danger border border-red-200',
  success: 'bg-success-bg text-success border border-green-200',
};

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryAction,
  badge,
}: PageHeaderProps) {
  const PrimaryIcon = primaryAction?.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-text-muted mb-1.5">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-brand-600 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-secondary font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title row */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          {badge && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClasses[badge.color]}`}>
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-btn border border-border text-sm font-semibold text-text-secondary hover:bg-bg-muted transition-colors"
              >
                {SecondaryIcon && <SecondaryIcon className="w-4 h-4" />}
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-btn border border-border text-sm font-semibold text-text-secondary hover:bg-bg-muted transition-colors"
              >
                {SecondaryIcon && <SecondaryIcon className="w-4 h-4" />}
                {secondaryAction.label}
              </button>
            )
          )}
          {primaryAction && (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className="btn-primary"
              >
                {PrimaryIcon && <PrimaryIcon className="w-4 h-4" />}
                {primaryAction.label}
              </Link>
            ) : (
              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {primaryAction.loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : PrimaryIcon ? (
                  <PrimaryIcon className="w-4 h-4" />
                ) : null}
                {primaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
