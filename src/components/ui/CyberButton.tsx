'use client';

import React from 'react';
import { sounds } from '@/lib/audio';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'violet' | 'green' | 'red' | 'outline' | 'amber' | 'gold' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
  variant = 'cyan',
  size = 'md',
  loading = false,
  icon,
  children,
  onClick,
  className = '',
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      sounds.playClick();
      if (onClick) onClick(e);
    }
  };

  const baseStyles = 'relative inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-200 select-none active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none overflow-hidden group tracking-wide';

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5 shadow-xl',
    xl: 'px-9 py-4 text-lg gap-3 shadow-2xl font-extrabold'
  };

  const variantStyles = {
    cyan: 'bg-gradient-to-r from-[#00D9FF] via-[#00B4D8] to-[#0096C7] text-[#030A17] hover:shadow-[0_0_30px_rgba(0,217,255,0.7)] border border-[#80EEFF]/50',
    violet: 'bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] text-white hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] border border-[#C4B5FD]/40',
    green: 'bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] text-white hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] border border-[#6EE7B7]/40',
    red: 'bg-gradient-to-r from-[#EF4444] via-[#DC2626] to-[#B91C1C] text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] border border-[#FCA5A5]/40',
    amber: 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#B45309] text-[#030A17] hover:shadow-[0_0_30px_rgba(245,158,11,0.7)] border border-[#FDE68A]/50',
    gold: 'bg-gradient-to-r from-[#FFE259] to-[#FFA751] text-[#030A17] hover:shadow-[0_0_35px_rgba(255,215,0,0.8)] border border-[#FFF3B0]/60',
    outline: 'border border-cyber-cyan/40 bg-surface/50 text-cyber-cyan hover:bg-cyber-cyan/15 hover:border-cyber-cyan hover:shadow-[0_0_20px_rgba(0,217,255,0.35)] backdrop-blur-md',
    glass: 'border border-white/15 bg-white/5 text-gray-100 hover:bg-white/10 hover:border-white/30 backdrop-blur-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]'
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* Glossy Shimmer Reflection */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />

      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Syncing...
        </span>
      ) : (
        <>
          {icon && <span className="flex-shrink-0 transition-transform group-hover:scale-110">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
