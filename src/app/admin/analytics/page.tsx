'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  HelpCircle,
  Users,
  Trophy,
  Filter
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';

const COLORS = ['#00D9FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#2997FF'];

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (data.sessions) setSessions(data.sessions);
      });
  }, []);

  const fetchAnalytics = () => {
    setLoading(true);
    let url = '/api/analytics';
    if (selectedSessionId) url += `?sessionId=${selectedSessionId}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedSessionId]);

  const metrics = analytics?.metrics || {};
  const categoryStats = analytics?.categoryStats || [];
  const questionMetrics = analytics?.questionMetrics || [];

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Competition Results & Analytics"
        subtitle="Performance curves, question accuracy breakdown, and student understanding evaluation"
      />

      <main className="p-8 space-y-8 flex-1">
        {/* Session Filter Bar */}
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs uppercase font-bold text-gray-400">Target Session:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
            >
              <option value="">All Platform Sessions Aggregate</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionCode} — {s.title}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-cyber-cyan font-mono font-bold">
            Real-Time Statistical Engine
          </span>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
            <span className="text-[10px] uppercase text-gray-400 font-bold">Total Participants</span>
            <div className="text-2xl font-mono font-black text-white mt-1">
              {metrics.totalParticipants || 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
            <span className="text-[10px] uppercase text-gray-400 font-bold">Overall Accuracy</span>
            <div className="text-2xl font-mono font-black text-cyber-green mt-1">
              {metrics.overallAccuracy || 0}%
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
            <span className="text-[10px] uppercase text-gray-400 font-bold">Avg Response Time</span>
            <div className="text-2xl font-mono font-black text-cyber-cyan mt-1">
              {(metrics.avgResponseTimeMs ? metrics.avgResponseTimeMs / 1000 : 0).toFixed(1)}s
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border">
            <span className="text-[10px] uppercase text-gray-400 font-bold">Total Responses Recorded</span>
            <div className="text-2xl font-mono font-black text-cyber-violet mt-1">
              {metrics.totalResponses || 0}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Question Distribution */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyber-cyan" />
              Question Category Distribution
            </h3>

            <div className="h-64">
              {categoryStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0B2040', borderColor: '#1E3A6E', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No Category Data
                </div>
              )}
            </div>
          </div>

          {/* Top Performer Summary */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyber-gold" />
              Highest Scoring Participants
            </h3>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {analytics?.topPerformers?.map((p: any, idx: number) => (
                <div
                  key={p.id || idx}
                  className="p-3 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center font-bold font-mono text-gray-300">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white block">{p.name}</span>
                      <span className="text-[10px] text-gray-500">{p.department || 'Robotics'}</span>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-cyber-cyan text-sm">{p.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question-Wise Accuracy Chart */}
        {questionMetrics.length > 0 && (
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyber-green" />
              Question Accuracy (%) Curve
            </h3>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionMetrics}>
                  <XAxis dataKey="questionOrder" stroke="#6B7280" tickFormatter={(val) => `Q${val}`} />
                  <YAxis stroke="#6B7280" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B2040', borderColor: '#1E3A6E', borderRadius: '12px' }}
                    formatter={(val) => [`${val}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy" fill="#00D9FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
