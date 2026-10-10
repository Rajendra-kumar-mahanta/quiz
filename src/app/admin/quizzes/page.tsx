'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Play,
  Edit,
  Copy,
  Trash2,
  Clock,
  Zap,
  HelpCircle,
  Radio,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';

export default function AdminQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const fetchQuizzes = () => {
    setLoading(true);
    fetch(`/api/quizzes?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quizzes) setQuizzes(data.quizzes);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuizzes();
  }, [search]);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'POST' });
      if (res.ok) {
        fetchQuizzes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete quiz "${title}" and all its questions?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchQuizzes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunchSession = async (quizId: string) => {
    setLaunchingId(quizId);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId })
      });
      const data = await res.json();
      if (data.session) {
        router.push(`/admin/sessions/${data.session.id}`);
      } else {
        alert(data.error || 'Failed to launch session');
      }
    } catch (err) {
      alert('Error launching session');
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Quiz Management"
        subtitle="Manage technical quiz sets, scoring parameters, and launch live competition sessions"
        actions={
          <Link href="/admin/quizzes/new">
            <CyberButton variant="cyan" size="sm" icon={<Plus className="w-4 h-4" />}>
              Create New Quiz
            </CyberButton>
          </Link>
        }
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quizzes by title or subject..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-card border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
            />
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {quizzes.length} quiz sets available
          </span>
        </div>

        {/* Quizzes List */}
        {loading ? (
          <div className="text-center py-12 text-cyber-cyan font-mono text-sm">
            Loading Quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border">
            <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-200">No Quizzes Found</h3>
            <p className="text-xs text-gray-400 mt-1 mb-4">Create your first technical quiz to get started.</p>
            <Link href="/admin/quizzes/new">
              <CyberButton variant="cyan" size="sm" icon={<Plus className="w-4 h-4" />}>
                Create New Quiz
              </CyberButton>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-6 rounded-2xl bg-surface-card border border-surface-border hover:border-cyber-cyan/40 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-[11px] font-mono font-bold">
                      {quiz.subject || 'Robotics'}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      {quiz._count?.questions || 0} Questions
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-white leading-snug mb-2 group-hover:text-cyber-cyan transition-colors">
                    {quiz.title}
                  </h3>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
                    {quiz.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-dark/80 border border-surface-border text-xs text-gray-400 font-mono mb-6">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyber-cyan" />
                      <span>{quiz.defaultDuration}s / question</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyber-violet" />
                      <span>{quiz.baseMarks} + {quiz.maxBonus} max pts</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="space-y-2 pt-2 border-t border-surface-border">
                  <CyberButton
                    variant="cyan"
                    size="sm"
                    className="w-full"
                    loading={launchingId === quiz.id}
                    disabled={quiz._count?.questions === 0}
                    onClick={() => handleLaunchSession(quiz.id)}
                    icon={<Play className="w-3.5 h-3.5" />}
                  >
                    Launch Live Session
                  </CyberButton>

                  <div className="flex items-center gap-2">
                    <Link href={`/admin/quizzes/${quiz.id}/edit`} className="flex-1">
                      <button className="w-full py-1.5 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-xs text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition-all">
                        <Edit className="w-3.5 h-3.5 text-cyber-cyan" />
                        Edit & Questions
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDuplicate(quiz.id)}
                      className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-400 hover:text-cyber-violet transition-all"
                      title="Duplicate Quiz"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.id, quiz.title)}
                      className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-400 hover:text-cyber-red transition-all"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
