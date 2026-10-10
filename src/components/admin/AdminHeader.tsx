'use client';

import React from 'react';
import Link from 'next/link';
import { Radio, ExternalLink, ShieldCheck, User } from 'lucide-react';
import { SoundToggle } from '../ui/SoundToggle';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="sticky top-0 z-20 bg-surface-dark/90 backdrop-blur-md border-b border-surface-border px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <SoundToggle />
        <Link
          href="/"
          target="_blank"
          className="p-2 rounded-xl bg-surface border border-surface-border text-gray-400 hover:text-cyber-cyan hover:border-cyber-cyan/50 transition-all text-xs flex items-center gap-1.5"
          title="Open Public Portal"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">Public Portal</span>
        </Link>
        <div className="flex items-center gap-2 pl-3 border-l border-surface-border text-xs text-gray-300">
          <div className="w-7 h-7 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan font-bold">
            A
          </div>
          <span className="hidden lg:inline font-medium">Administrator</span>
        </div>
      </div>
    </header>
  );
};
