'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Sparkles, Sliders, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';

export default function CreateQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Robotics / Embedded Systems');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [baseMarks, setBaseMarks] = useState(10);
  const [maxBonus, setMaxBonus] = useState(10);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showAnswerAfterQuestion, setShowAnswerAfterQuestion] = useState(true);
  const [showLeaderboardAfterQuestion, setShowLeaderboardAfterQuestion] = useState(true);
  const [allowLateJoin, setAllowLateJoin] = useState(true);
  const [showPersonalScore, setShowPersonalScore] = useState(true);
  const [instructions, setInstructions] = useState('1. Each question lasts 30 seconds.\n2. Earn 10 Base Marks plus up to 10 Speed Bonus points for rapid correct responses: floor(remaining_sec / 3).\n3. Wrong or unanswered questions award 0 points.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Quiz Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          subject: subject.trim() || 'General Robotics',
          defaultDuration: Number(defaultDuration),
          baseMarks: Number(baseMarks),
          maxBonus: Number(maxBonus),
          negativeMarking,
          negativeMarks: Number(negativeMarks),
          shuffleQuestions,
          shuffleOptions,
          showAnswerAfterQuestion,
          showLeaderboardAfterQuestion,
          allowLateJoin,
          showPersonalScore,
          instructions: instructions.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create quiz');
      }

      router.push(`/admin/quizzes/${data.quiz.id}/edit`);
    } catch (err: any) {
      setError(err.message || 'Error creating quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Create New Quiz"
        subtitle="Configure quiz details, duration, scoring system, and session rules"
        actions={
          <Link href="/admin/quizzes">
            <CyberButton variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Quizzes
            </CyberButton>
          </Link>
        }
      />

      <main className="p-8 max-w-4xl mx-auto w-full">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-cyber-red/10 border border-cyber-red text-cyber-red text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Information Card */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyber-cyan" />
              General Quiz Information
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Quiz Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced Arduino & Sensor Interfacing Challenge"
                className="w-full px-4 py-3 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Subject / Category
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Embedded Systems"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Default Time Limit per Question (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Description / Overview
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the competition scope, eligibility, and topics covered..."
                className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none"
              />
            </div>
          </div>

          {/* Scoring Engine Configuration */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyber-violet" />
              Scoring Engine & Speed Bonus Rules
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Base Correct Marks
                </label>
                <input
                  type="number"
                  min="1"
                  value={baseMarks}
                  onChange={(e) => setBaseMarks(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Default: 10 marks per question</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Maximum Speed Bonus
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxBonus}
                  onChange={(e) => setMaxBonus(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Formula: floor(remaining_sec / 3)</span>
              </div>
            </div>

            {/* Negative Marking Toggle */}
            <div className="p-4 rounded-xl bg-surface-dark/60 border border-surface-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Negative Marking</span>
                <span className="text-[11px] text-gray-400">Deduct points for incorrect responses (Default: Disabled)</span>
              </div>
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="w-5 h-5 accent-cyber-cyan rounded"
              />
            </div>

            {negativeMarking && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cyber-red mb-1.5">
                  Negative Marks Deduction
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                  className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-surface-dark border border-cyber-red/50 text-white text-sm outline-none"
                />
              </div>
            )}
          </div>

          {/* Gameplay & Visibility Toggles */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <h2 className="text-base font-bold text-white mb-2">
              Display & Session Options
            </h2>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-dark/60 border border-surface-border cursor-pointer">
              <span className="text-xs text-gray-200">Show correct answer & explanation after each question</span>
              <input
                type="checkbox"
                checked={showAnswerAfterQuestion}
                onChange={(e) => setShowAnswerAfterQuestion(e.target.checked)}
                className="w-4 h-4 accent-cyber-cyan"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-dark/60 border border-surface-border cursor-pointer">
              <span className="text-xs text-gray-200">Show live leaderboard after each question</span>
              <input
                type="checkbox"
                checked={showLeaderboardAfterQuestion}
                onChange={(e) => setShowLeaderboardAfterQuestion(e.target.checked)}
                className="w-4 h-4 accent-cyber-cyan"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-dark/60 border border-surface-border cursor-pointer">
              <span className="text-xs text-gray-200">Allow participants to join while session is live</span>
              <input
                type="checkbox"
                checked={allowLateJoin}
                onChange={(e) => setAllowLateJoin(e.target.checked)}
                className="w-4 h-4 accent-cyber-cyan"
              />
            </label>
          </div>

          {/* Instructions */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Participant Instructions (Displayed in Waiting Room)
            </label>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-xs outline-none font-mono"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/admin/quizzes">
              <CyberButton variant="outline" size="md">
                Cancel
              </CyberButton>
            </Link>
            <CyberButton
              type="submit"
              variant="cyan"
              size="md"
              loading={loading}
              icon={<Save className="w-4 h-4" />}
            >
              Create Quiz & Add Questions
            </CyberButton>
          </div>
        </form>
      </main>
    </div>
  );
}
