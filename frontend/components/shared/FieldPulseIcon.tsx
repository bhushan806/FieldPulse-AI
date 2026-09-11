'use client';

import React from 'react';

interface FieldPulseIconProps {
  size?: number | string;
  className?: string;
  variant?: 'color' | 'monochrome' | 'white';
  withContainer?: boolean;
}

export function FieldPulseIcon({
  size = 28,
  className = '',
  variant = 'color',
  withContainer = false,
}: FieldPulseIconProps) {
  const isMonochrome = variant === 'monochrome';
  const isWhite = variant === 'white';

  const strokeColor = isWhite
    ? '#FFFFFF'
    : isMonochrome
    ? 'currentColor'
    : 'url(#fieldpulse-gradient)';

  const dotColor = isWhite
    ? '#FFFFFF'
    : isMonochrome
    ? 'currentColor'
    : '#06B6D4';

  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="fieldpulse-gradient"
          x1="2"
          y1="16"
          x2="30"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="45%" stopColor="#6366F1" />
          <stop offset="65%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      {/* Structural Pipeline Axis with Central Telemetry Pulse */}
      <path
        d="M 2 16 H 9 L 13 7 L 18 25 L 22 16 H 30"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* High-Precision Monitoring Node Dot at Pulse Apex */}
      <circle
        cx="13"
        cy="7"
        r="1.8"
        fill={dotColor}
      />
    </svg>
  );

  if (withContainer) {
    return (
      <div
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800/80 shadow-md p-2 flex-shrink-0"
        style={{ width: typeof size === 'number' ? size + 16 : 'auto', height: typeof size === 'number' ? size + 16 : 'auto' }}
      >
        {svgContent}
      </div>
    );
  }

  return svgContent;
}
