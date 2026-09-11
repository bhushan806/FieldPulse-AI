'use client';

import React from 'react';
import Link from 'next/link';
import { FieldPulseIcon } from './FieldPulseIcon';

interface FieldPulseLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'stacked';
  variant?: 'default' | 'white' | 'monochrome';
  href?: string;
  withBadge?: boolean;
}

export function FieldPulseLogo({
  className = '',
  size = 'md',
  orientation = 'horizontal',
  variant = 'default',
  href,
  withBadge = true,
}: FieldPulseLogoProps) {
  const iconSizes = {
    sm: 22,
    md: 28,
    lg: 36,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const aiPillSizes = {
    sm: 'text-[9px] px-1.5 py-0.2',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-0.5',
  };

  const isWhite = variant === 'white';
  const isMono = variant === 'monochrome';

  const textColor = isWhite
    ? 'text-white'
    : isMono
    ? 'text-current'
    : 'text-text-primary';

  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none ${
        orientation === 'stacked' ? 'flex-col items-center text-center' : 'flex-row'
      } ${className}`}
    >
      {/* The Pulse Line Icon */}
      <FieldPulseIcon
        size={iconSizes[size]}
        variant={variant === 'white' ? 'white' : variant === 'monochrome' ? 'monochrome' : 'color'}
        withContainer
      />

      {/* Wordmark Typography */}
      <div className="flex items-center gap-2">
        <span className={`font-black tracking-tight ${textSizes[size]} ${textColor}`}>
          FieldPulse
        </span>

        {withBadge && (
          <span
            className={`font-mono font-bold uppercase tracking-wider rounded-md border ${
              isWhite
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-brand-500/10 text-brand-600 dark:text-cyan-400 border-brand-500/20'
            } ${aiPillSizes[size]}`}
          >
            AI
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
