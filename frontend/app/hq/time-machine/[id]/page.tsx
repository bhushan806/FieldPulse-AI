'use client';

import React from 'react';
import { TimeMachineView } from '@/components/time-machine/TimeMachineView';

export default function HQTimeMachinePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <TimeMachineView activityId={params.id} backHref="/hq/portfolio" />
    </div>
  );
}
