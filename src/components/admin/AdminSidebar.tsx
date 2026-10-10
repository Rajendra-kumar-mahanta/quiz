'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  HelpCircle,
  Radio,
  Users,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Cpu,
  Trophy
} from 'lucide-react';
import { sounds } from '@/lib/audio';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/quizzes', label: 'Quiz Management', icon: Layers },
  { href: '/admin/questions', label: 'Question Bank', icon: HelpCircle },
  { href: '/admin/sessions', label: 'Live Sessions', icon: Radio },
  { href: '/admin/participants', label: 'Participants', icon: Users },
  { href: '/admin/analytics', label: 'Results & Analytics', icon: BarChart3 },
  { href: '/admin/reports', label: 'Reports & Exports', icon: FileText },
  { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
];

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    sounds.playClick();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <aside className="w-64 bg-surface-dark border-r border-surface-border flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-surface-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-cyan to-cyber-violet flex items-center justify-center shadow-[0_0_15px_rgba(0,217,255,0.4)]">
            <Cpu className="w-6 h-6 text-surface-dark" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-wider flex items-center gap-1.5 font-heading">
              ROBO<span className="text-cyber-cyan">QUEST</span>
            </span>
            <span className="text-[10px] text-cyber-violet font-semibold tracking-widest block uppercase">
              Control Center
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => sounds.playClick()}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyber-cyan/20 to-transparent border-l-4 border-cyber-cyan text-cyber-cyan font-semibold shadow-[inset_0_0_15px_rgba(0,217,255,0.1)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyber-cyan' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-surface-border bg-surface-dark/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyber-red/30 bg-cyber-red/10 text-cyber-red hover:bg-cyber-red hover:text-white transition-all text-xs font-semibold uppercase tracking-wider"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
