'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Plus,
  Play,
  QrCode,
  Download,
  Users,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';
import { QRCodeModal } from '@/components/ui/QRCodeModal';

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedQR, setSelectedQR] = useState<{ code: string; title: string; pin?: string } | null>(null);

  const fetchSessions = () => {
    setLoading(true);
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (data.sessions) setSessions(data.sessions);
      })
      .finally(() => setLoading(false));
  };

  const fetchQuizzes = () => {
    fetch('/api/quizzes')
      .then((res) => res.json())
      .then((data) => {
        if (data.quizzes) {
          setQuizzes(data.quizzes);
          if (data.quizzes.length > 0 && !selectedQuizId) {
            setSelectedQuizId(data.quizzes[0].id);
          }
        }
      });
  };

  useEffect(() => {
    fetchSessions();
    fetchQuizzes();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId) return;

    setCreating(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: selectedQuizId,
          title: sessionTitle.trim() || undefined,
          joinPin: joinPin.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setSessionTitle('');
        setJoinPin('');
        fetchSessions();
      } else {
        alert(data.error || 'Failed to create session');
      }
    } catch (err) {
      alert('Error creating session');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Live Competition Sessions"
        subtitle="Manage active waiting rooms, monitor live questions, and review past workshop results"
        actions={
          <CyberButton
            variant="cyan"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Launch New Session
          </CyberButton>
        }
      />

      <main className="p-8 space-y-6 flex-1">
        {loading ? (
          <div className="text-center py-12 text-cyber-cyan font-mono text-sm">
            Loading Sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border">
            <Radio className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-200">No Competition Sessions</h3>
            <p className="text-xs text-gray-400 mt-1 mb-4">Launch a new session to invite participants via QR code.</p>
            <CyberButton
              variant="cyan"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Launch New Session
            </CyberButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((s) => {
              const isLive = s.status !== 'COMPLETED' && s.status !== 'CANCELLED';
              return (
                <div
                  key={s.id}
                  className={`p-6 rounded-2xl bg-surface-card border transition-all flex flex-col justify-between shadow-lg ${
                    isLive ? 'border-cyber-cyan/50 shadow-[0_0_20px_rgba(0,217,255,0.15)]' : 'border-surface-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-bold">
                          {s.sessionCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isLive
                              ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                              : 'bg-surface text-gray-400 border border-surface-border'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedQR({ code: s.sessionCode, title: s.title, pin: s.joinPin })}
                        className="p-1.5 rounded-lg bg-surface border border-surface-border text-gray-400 hover:text-cyber-cyan transition-all"
                        title="Display QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-base font-extrabold text-white leading-snug mb-1">
                      {s.title}
                    </h3>
                    <p className="text-xs text-cyber-cyan font-mono mb-4">
                      {s.quiz?.title || 'Workshop'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-dark/80 border border-surface-border text-xs text-gray-400 font-mono mb-6">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-cyber-violet" />
                        <span>{s._count?.participants || 0} Students</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyber-cyan" />
                        <span>{s._count?.sessionQuestions || 0} Questions</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-surface-border">
                    <Link href={`/admin/sessions/${s.id}`} className="block">
                      <CyberButton variant="cyan" size="sm" className="w-full" icon={<Radio className="w-3.5 h-3.5" />}>
                        Live Mission Control
                      </CyberButton>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link href={`/leaderboard/${s.sessionCode}`} target="_blank" className="flex-1">
                        <button className="w-full py-1.5 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-xs text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition-all">
                          <ExternalLink className="w-3.5 h-3.5 text-cyber-cyan" />
                          Podium
                        </button>
                      </Link>

                      <a
                        href={`/api/sessions/${s.id}/export?format=csv`}
                        className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-400 hover:text-cyber-green transition-all"
                        title="Download CSV Results"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Launch Session Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-surface-dark border border-cyber-cyan/40 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyber-cyan" />
              Launch Live Competition Session
            </h2>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Select Quiz Set *
                </label>
                <select
                  required
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none focus:border-cyber-cyan"
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q._count?.questions || 0} Questions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Session Title (Optional)
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. B.Tech Batch 2026 Live Finals"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Access Join PIN (Optional)
                </label>
                <input
                  type="text"
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value)}
                  placeholder="Leave empty for public join"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none focus:border-cyber-cyan"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <CyberButton variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </CyberButton>
                <CyberButton
                  type="submit"
                  variant="cyan"
                  size="sm"
                  loading={creating}
                  icon={<Play className="w-4 h-4" />}
                >
                  Launch & Generate QR
                </CyberButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
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
