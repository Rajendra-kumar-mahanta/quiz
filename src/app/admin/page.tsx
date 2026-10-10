'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  HelpCircle,
  Radio,
  Users,
  BarChart3,
  Plus,
  Play,
  QrCode,
  Trophy,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';
import { QRCodeModal } from '@/components/ui/QRCodeModal';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<{ code: string; title: string; pin?: string } | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {
    totalQuizzes: 0,
    totalQuestions: 0,
    totalSessions: 0,
    totalParticipants: 0,
    totalResponses: 0,
    overallAccuracy: 0,
    avgResponseTimeMs: 0,
    activeSessionsCount: 0
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Mission Control Dashboard"
        subtitle="Live platform metrics, active competition sessions, and quick actions"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/quizzes/new">
              <CyberButton variant="cyan" size="sm" icon={<Plus className="w-4 h-4" />}>
                Create Quiz
              </CyberButton>
            </Link>
          </div>
        }
      />

      <main className="p-8 space-y-8 flex-1">
        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-cyber-cyan/40 transition-all">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
              <span>TOTAL QUIZZES</span>
              <Layers className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-white">
              {metrics.totalQuizzes}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              {metrics.totalQuestions} questions in bank
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-cyber-violet/40 transition-all">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
              <span>TOTAL PARTICIPANTS</span>
              <Users className="w-4 h-4 text-cyber-violet" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-white">
              {metrics.totalParticipants}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Across {metrics.totalSessions} sessions
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-cyber-green/40 transition-all">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
              <span>AVERAGE ACCURACY</span>
              <TrendingUp className="w-4 h-4 text-cyber-green" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-cyber-green">
              {metrics.overallAccuracy}%
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              {metrics.totalResponses} total answers
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-cyber-amber/40 transition-all">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
              <span>AVG RESPONSE SPEED</span>
              <Clock className="w-4 h-4 text-cyber-amber" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-cyber-amber">
              {(metrics.avgResponseTimeMs / 1000).toFixed(1)}s
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Server-authoritative timing
            </span>
          </div>
        </div>

        {/* Active Live Sessions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-ping" />
              <h2 className="text-lg font-bold text-white">Active Competition Sessions</h2>
            </div>
            <Link href="/admin/sessions" className="text-xs text-cyber-cyan hover:underline font-semibold flex items-center gap-1">
              View All Sessions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data?.activeSessions && data.activeSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.activeSessions.map((s: any) => (
                <div
                  key={s.id}
                  className="p-6 rounded-2xl bg-surface-card border border-cyber-cyan/40 shadow-[0_0_20px_rgba(0,217,255,0.1)] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-bold">
                        CODE: {s.sessionCode}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-[10px] text-cyber-green font-bold uppercase">
                        {s.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedQR({ code: s.sessionCode, title: s.title, pin: s.joinPin })}
                      className="p-1.5 rounded-lg bg-surface border border-surface-border text-gray-400 hover:text-cyber-cyan transition-all"
                      title="Show Session QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-white mb-2">
                    {s.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-6 font-mono">
                    <span>👥 {s._count?.participants || 0} Connected</span>
                    <span>📝 {s._count?.responses || 0} Submissions</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-surface-border">
                    <Link href={`/admin/sessions/${s.id}`} className="flex-1">
                      <CyberButton variant="cyan" size="sm" className="w-full" icon={<Radio className="w-3.5 h-3.5" />}>
                        Enter Live Mission Control
                      </CyberButton>
                    </Link>
                    <Link href={`/leaderboard/${s.sessionCode}`} target="_blank">
                      <CyberButton variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Podium Screen
                      </CyberButton>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-surface-card border border-surface-border">
              <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-300">No Live Sessions Active</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Launch a live session from any quiz to enable QR code participant joining and real-time competition.
              </p>
              <Link href="/admin/quizzes">
                <CyberButton variant="cyan" size="sm" icon={<Play className="w-3.5 h-3.5" />}>
                  Launch Session from Quiz
                </CyberButton>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Grid: Top Performers & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyber-gold" />
                Global Top Performers
              </h3>
              <Link href="/admin/participants" className="text-xs text-cyber-cyan hover:underline">
                View All
              </Link>
            </div>

            {data?.topPerformers && data.topPerformers.length > 0 ? (
              <div className="space-y-2.5">
                {data.topPerformers.slice(0, 5).map((p: any, idx: number) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center text-xs font-mono font-bold text-gray-300">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white block">{p.name}</span>
                        <span className="text-[10px] text-gray-500">{p.session?.title || 'Workshop'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-cyber-cyan">
                      {p.totalScore} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-500">
                No participant records yet.
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-cyber-cyan" />
              Quick Mission Control Shortcuts
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/quizzes/new" className="p-4 rounded-xl bg-surface hover:bg-surface-light border border-surface-border transition-all">
                <Layers className="w-5 h-5 text-cyber-cyan mb-2" />
                <span className="text-xs font-bold text-white block">New Quiz</span>
                <span className="text-[10px] text-gray-400">Configure quiz settings & timers</span>
              </Link>

              <Link href="/admin/questions" className="p-4 rounded-xl bg-surface hover:bg-surface-light border border-surface-border transition-all">
                <HelpCircle className="w-5 h-5 text-cyber-violet mb-2" />
                <span className="text-xs font-bold text-white block">Question Bank</span>
                <span className="text-[10px] text-gray-400">Manage 20-question challenge</span>
              </Link>

              <Link href="/admin/analytics" className="p-4 rounded-xl bg-surface hover:bg-surface-light border border-surface-border transition-all">
                <BarChart3 className="w-5 h-5 text-cyber-green mb-2" />
                <span className="text-xs font-bold text-white block">Analytics</span>
                <span className="text-[10px] text-gray-400">Accuracy & response curves</span>
              </Link>

              <Link href="/admin/reports" className="p-4 rounded-xl bg-surface hover:bg-surface-light border border-surface-border transition-all">
                <CheckCircle2 className="w-5 h-5 text-cyber-amber mb-2" />
                <span className="text-xs font-bold text-white block">Exports & Reports</span>
                <span className="text-[10px] text-gray-400">CSV & PDF workshop certificates</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Projection Modal */}
      {selectedQR && (
        <QRCodeModal
          isOpen={Boolean(selectedQR)}
          onClose={() => setSelectedQR(null)}
          sessionCode={selectedQR.code}
          quizTitle={selectedQR.title}
          joinPin={selectedQR.pin}
        />
      )}
    </div>
  );
}
