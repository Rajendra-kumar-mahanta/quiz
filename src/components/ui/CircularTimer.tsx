'use client';

import React, { useEffect } from 'react';
import { sounds } from '@/lib/audio';

interface CircularTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  remainingSeconds,
  totalSeconds,
  size = 140,
  strokeWidth = 10
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const validTotal = totalSeconds > 0 ? totalSeconds : 30;
  const validRemaining = Math.max(0, Math.min(validTotal, remainingSeconds));
  const progress = validRemaining / validTotal;
  const strokeDashoffset = circumference - (progress * circumference);

  // Determine timer color state
  const isUrgent = validRemaining <= 5;
  const isWarning = validRemaining <= 10 && !isUrgent;

  const strokeColor = isUrgent
    ? '#EF4444' // Red
    : isWarning
    ? '#F59E0B' // Amber
    : '#00D9FF'; // Cyan

  const glowClass = isUrgent
    ? 'drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]'
    : isWarning
    ? 'drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]'
    : 'drop-shadow-[0_0_12px_rgba(0,217,255,0.8)]';

  useEffect(() => {
    if (validRemaining > 0 && validRemaining <= 10) {
      sounds.playTick(isUrgent);
    }
  }, [validRemaining, isUrgent]);

  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0B2040"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className={`transition-all duration-1000 ease-linear ${glowClass}`}
        />
      </svg>
      {/* Center Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`text-3xl font-extrabold font-mono tracking-tighter ${
            isUrgent ? 'text-cyber-red animate-pulse' : isWarning ? 'text-cyber-amber' : 'text-cyber-cyan'
          }`}
        >
          {validRemaining}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
          SEC
        </span>
      </div>
    </div>
  );
};
