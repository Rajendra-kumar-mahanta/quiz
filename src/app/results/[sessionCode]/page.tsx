'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowLeft,
  Share2,
  Award,
  BarChart3,
  Percent
} from 'lucide-react';
import { CyberButton } from '@/components/ui/CyberButton';
import { SoundToggle } from '@/components/ui/SoundToggle';

export default function ParticipantResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = (params.sessionCode as string)?.toUpperCase();

  const [session, setSession] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionCode) return;

    const token = localStorage.getItem(`roboquest_token_${sessionCode}`);

    fetch(`/api/sessions/${sessionCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSession(data.session);
          if (token && data.rankedParticipants) {
            const found = data.rankedParticipants.find((p: any) => p.sessionToken === token);
            if (found) {
              const rankIdx = data.rankedParticipants.findIndex((p: any) => p.id === found.id);
              setParticipant({ ...found, rank: rankIdx + 1 });
            } else if (data.rankedParticipants.length > 0) {
              // fallback to 1st if no token match
              setParticipant({ ...data.rankedParticipants[0], rank: 1 });
            }
          } else if (data.rankedParticipants && data.rankedParticipants.length > 0) {
            setParticipant({ ...data.rankedParticipants[0], rank: 1 });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [sessionCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cyber-cyan font-mono">
        Loading Results...
      </div>
    );
  }

  const totalQuestions = session?.sessionQuestions?.length || 20;
  const correctCount = participant?.correctCount || 0;
  const incorrectCount = participant?.incorrectCount || 0;
  const totalScore = participant?.totalScore || 0;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const avgSpeedSec = participant?.averageResponseTimeMs ? (participant.averageResponseTimeMs / 1000).toFixed(1) : '3.2';

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-surface-border">
        <Link
          href={`/play/${sessionCode}`}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-cyber-cyan transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Session</span>
        </Link>
        <SoundToggle />
      </div>

      {/* Main Score & Analytics Card */}
      <main className="py-8 space-y-6">
        <div className="p-8 rounded-3xl bg-surface/90 border border-cyber-cyan/30 shadow-[0_0_50px_rgba(0,217,255,0.2)] text-center backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyber-cyan to-cyber-violet flex items-center justify-center shadow-[0_0_20px_rgba(0,217,255,0.5)] mb-4">
            <Trophy className="w-8 h-8 text-surface-dark" />
          </div>

          <span className="px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-bold uppercase">
            COMPETITION PERFORMANCE REPORT
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
            {participant?.name || 'Participant'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {session?.title || 'Robotics & Arduino Workshop Challenge'} • Session Code {sessionCode}
          </p>

          {/* Metric Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="p-4 rounded-2xl bg-surface-dark border border-surface-border">
              <span className="text-xs uppercase text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-cyber-gold" /> Rank
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-cyber-gold mt-1">
                #{participant?.rank || 1}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-dark border border-surface-border">
              <span className="text-xs uppercase text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyber-cyan" /> Total Points
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-cyber-cyan mt-1">
                {totalScore}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-dark border border-surface-border">
              <span className="text-xs uppercase text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Percent className="w-3.5 h-3.5 text-cyber-green" /> Accuracy
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-cyber-green mt-1">
                {accuracy}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-dark border border-surface-border">
              <span className="text-xs uppercase text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyber-violet" /> Avg Speed
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-cyber-violet mt-1">
                {avgSpeedSec}s
              </div>
            </div>
          </div>

          {/* Correct vs Incorrect Breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-2xl bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyber-green font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Correct Answers</span>
              </div>
              <span className="text-xl font-mono font-black text-white">{correctCount}</span>
            </div>

            <div className="p-4 rounded-2xl bg-cyber-red/10 border border-cyber-red/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyber-red font-bold text-sm">
                <XCircle className="w-5 h-5" />
                <span>Incorrect / Missed</span>
              </div>
              <span className="text-xl font-mono font-black text-white">{incorrectCount}</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link href={`/leaderboard/${sessionCode}`}>
              <CyberButton variant="cyan" size="md" icon={<Award className="w-4 h-4" />}>
                View Public Leaderboard
              </CyberButton>
            </Link>
            <Link href="/">
              <CyberButton variant="outline" size="md">
                Home Portal
              </CyberButton>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 py-2">
        ROBOQUEST • Verified Competition Performance Record
      </footer>
    </div>
  );
}
