'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Crown,
  Medal,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowLeft,
  Zap,
  Flame,
  Star,
  Users,
  CheckCircle2,
  Clock,
  HelpCircle,
  BarChart3,
  Award,
  Download,
  ShieldCheck
} from 'lucide-react';
import { getSocketClient } from '@/lib/socket-client';
import { sounds } from '@/lib/audio';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { CircularTimer } from '@/components/ui/CircularTimer';
import { CodeViewer } from '@/components/ui/CodeViewer';

export default function PresentationLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = (params.sessionCode as string)?.toUpperCase();

  const [session, setSession] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('WAITING_ROOM');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [totalSeconds, setTotalSeconds] = useState<number>(30);
  const [attendedCount, setAttendedCount] = useState<number>(0);
  const [unattendedCount, setUnattendedCount] = useState<number>(0);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [closedData, setClosedData] = useState<any>(null);
  const [reviewRemaining, setReviewRemaining] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSessionData = () => {
    if (!sessionCode) return;
    fetch(`/api/sessions/${sessionCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSession(data.session);
          setSessionStatus(data.session.status);
          const parts = data.rankedParticipants || [];
          setTotalParticipants(parts.length);
          setLeaderboard(parts.map((p: any, idx: number) => ({
            rank: idx + 1,
            id: p.id,
            name: p.name,
            rollNumber: p.rollNumber,
            department: p.department,
            institution: p.institution,
            score: p.totalScore,
            bonus: p.totalBonus,
            correctCount: p.correctCount,
            incorrectCount: p.incorrectCount,
            avgResponseTimeMs: p.averageResponseTimeMs,
            avatar: p.name.charAt(0).toUpperCase()
          })));

          if (data.session.currentQuestionIndex >= 0 && data.session.sessionQuestions) {
            const sq = data.session.sessionQuestions[data.session.currentQuestionIndex];
            if (sq) {
              const qData = JSON.parse(sq.snapshotData);
              setActiveQuestion({
                ...qData,
                index: data.session.currentQuestionIndex,
                totalQuestions: data.session.sessionQuestions.length,
                isClosed: sq.isClosed
              });
              setTotalSeconds(qData.duration || 30);
              const responses = sq.responses || [];
              setAttendedCount(responses.length);
              setUnattendedCount(Math.max(0, parts.length - responses.length));
            }
          }
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchSessionData();

    const socket = getSocketClient();

    socket.emit('session:join', {
      sessionCode,
      role: 'leaderboard'
    });

    socket.on('session:state', (data: any) => {
      if (data.session) {
        setSession(data.session);
        setSessionStatus(data.session.status);
      }
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.activeQuestion) {
        setActiveQuestion(data.activeQuestion);
        setRemainingSeconds(data.session.remainingSeconds || data.activeQuestion.duration || 30);
        setTotalSeconds(data.activeQuestion.duration || 30);
      }
      if (data.session?.participantCount !== undefined) {
        setTotalParticipants(data.session.participantCount);
      }
    });

    // Reset telemetry on new question start
    socket.on('session:question_started', (data: any) => {
      sounds.playStart();
      setActiveQuestion(data.question);
      setSessionStatus('ACTIVE_QUESTION');
      setRemainingSeconds(data.question.duration || 30);
      setTotalSeconds(data.question.duration || 30);
      setAttendedCount(0);
      setUnattendedCount(totalParticipants || 0);
      setDistribution({});
      setClosedData(null);
      setReviewRemaining(0);
      setIsPaused(false);
    });

    socket.on('session:timer_tick', (data: any) => {
      setRemainingSeconds(data.remainingSeconds);
      if (data.totalSeconds) setTotalSeconds(data.totalSeconds);
    });

    // Real-time submission update (Attended vs Unattended)
    socket.on('session:submission_update', (data: any) => {
      setAttendedCount(data.attendedCount);
      setUnattendedCount(data.unattendedCount);
      if (data.totalParticipants) setTotalParticipants(data.totalParticipants);
    });

    socket.on('session:review_tick', (data: any) => {
      setReviewRemaining(data.remainingSeconds);
    });

    socket.on('session:paused', () => {
      setIsPaused(true);
      setReviewRemaining(0);
    });

    socket.on('session:resumed', () => {
      setIsPaused(false);
    });

    socket.on('session:question_closed', (data: any) => {
      setSessionStatus('QUESTION_CLOSED');
      setClosedData(data);
      if (data.optionDistribution) setDistribution(data.optionDistribution);
      if (data.attendedCount !== undefined) setAttendedCount(data.attendedCount);
      if (data.unattendedCount !== undefined) setUnattendedCount(data.unattendedCount);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.reviewSeconds && !isPaused) setReviewRemaining(data.reviewSeconds);
    });

    socket.on('session:leaderboard', (data: any) => {
      setSessionStatus('SHOW_LEADERBOARD');
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    });

    socket.on('session:completed', (data: any) => {
      setSessionStatus('COMPLETED');
      if (data.finalRankings) setLeaderboard(data.finalRankings);
      sounds.playVictory();
      confetti({
        particleCount: 250,
        spread: 140,
        origin: { y: 0.5 }
      });
    });

    socket.on('session:participant_joined', () => {
      fetchSessionData();
    });

    return () => {
      socket.off('session:state');
      socket.off('session:question_started');
      socket.off('session:timer_tick');
      socket.off('session:submission_update');
      socket.off('session:review_tick');
      socket.off('session:paused');
      socket.off('session:resumed');
      socket.off('session:question_closed');
      socket.off('session:leaderboard');
      socket.off('session:completed');
      socket.off('session:participant_joined');
    };
  }, [sessionCode, totalParticipants, isPaused]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleBackNavigation = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (session?.id) {
      router.push(`/admin/sessions/${session.id}`);
    } else {
      router.push('/admin/sessions');
    }
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const isCompleted = sessionStatus === 'COMPLETED';

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-mesh-dark cyber-grid text-white flex flex-col justify-between p-3 sm:p-6 select-none relative overflow-hidden"
    >
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-yellow-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-white/10 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackNavigation}
            title="Return to Admin Panel / Previous Page"
            className="p-2.5 rounded-2xl bg-surface/80 border border-white/10 text-gray-400 hover:text-white hover:border-cyber-cyan hover:shadow-[0_0_15px_rgba(0,217,255,0.3)] transition-all flex items-center gap-1.5 text-xs font-mono font-bold"
          >
            <ArrowLeft className="w-5 h-5 text-cyber-cyan" />
            <span className="hidden sm:inline">BACK</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-0.5 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan text-xs font-mono font-bold">
                ARENA PIN: {sessionCode}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-cyber-green font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-cyber-green animate-ping" />
                {isCompleted ? 'FINAL TOURNAMENT STANDINGS' : 'LIVE AUDITORIUM PODIUM'}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white mt-1 truncate max-w-xl">
              {session?.quiz?.title || 'Robotics & Arduino Workshop Challenge'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session?.id && (
            <Link
              href={`/admin/sessions/${session.id}`}
              className="p-2.5 sm:p-3 rounded-2xl bg-surface/80 border border-white/10 text-gray-300 hover:text-cyber-cyan hover:border-cyber-cyan transition-all hidden md:flex items-center gap-2 text-xs font-mono font-bold"
            >
              <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
              <span>Admin Console</span>
            </Link>
          )}
          <SoundToggle />
          <button
            onClick={toggleFullscreen}
            className="p-2.5 sm:p-3 rounded-2xl bg-surface/80 border border-cyber-cyan/30 text-gray-200 hover:text-cyber-cyan hover:border-cyber-cyan hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Projection Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {isCompleted ? (
        /* ========================================================================= */
        /* COMPLETED STATE: GRAND TOP 3 PODIUM ON TOP + FULL ALL-PARTICIPANT LIST BELOW */
        /* ========================================================================= */
        <main className="flex-1 py-6 space-y-8 z-10 max-w-6xl mx-auto w-full animate-fade-in">
          {/* Victory Celebration Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 text-xs font-mono font-black tracking-widest uppercase shadow-[0_0_20px_rgba(255,215,0,0.3)]">
              <Trophy className="w-4 h-4 text-yellow-400" /> TOURNAMENT CONCLUDED • HALL OF FAME
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Grand Champions Podium
            </h2>
            <p className="text-sm text-gray-300 font-light">
              Official final rankings for {session?.quiz?.title || 'RoboQuest Challenge'}
            </p>
          </div>

          {/* 1. GRAND 3D TOP 3 PODIUM ON TOP */}
          <div className="p-6 sm:p-10 rounded-3xl glass-panel-glow border-2 border-yellow-500/40 relative overflow-hidden shadow-[0_0_50px_rgba(255,215,0,0.15)]">
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-2xl mx-auto pt-6">
              {/* 2nd Place Silver */}
              <div className="flex flex-col items-center">
                {top2 ? (
                  <>
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-3xl bg-surface-dark border-4 border-gray-300 flex items-center justify-center font-black text-lg sm:text-2xl text-white shadow-[0_0_25px_rgba(192,192,192,0.5)] mb-3">
                      {top2.name.charAt(0)}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-white text-center truncate max-w-[95px] sm:max-w-[150px]">
                      {top2.name}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-400 font-mono block truncate max-w-[95px] sm:max-w-[150px]">
                      {top2.department || 'Gladiator'}
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-gray-200 font-black mb-3 mt-1">
                      {top2.score} PTS
                    </span>
                  </>
                ) : (
                  <div className="h-24" />
                )}
                <div className="w-full h-32 sm:h-44 rounded-t-3xl bg-gradient-to-b from-gray-400/40 via-surface-card to-[#030917] border-t-4 border-l border-r border-gray-400 flex flex-col items-center justify-center shadow-xl">
                  <Medal className="w-8 h-8 text-gray-300 mb-1" />
                  <span className="text-xl sm:text-3xl font-black font-mono text-white">2ND</span>
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5">SILVER</span>
                </div>
              </div>

              {/* 1st Place Gold Champion */}
              <div className="flex flex-col items-center">
                {top1 ? (
                  <>
                    <div className="relative mb-3">
                      <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 absolute -top-7 sm:-top-9 left-1/2 transform -translate-x-1/2 animate-bounce drop-shadow-[0_0_15px_rgba(255,215,0,0.9)]" />
                      <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-3xl bg-surface-dark border-4 border-yellow-400 flex items-center justify-center font-black text-xl sm:text-3xl text-yellow-300 shadow-[0_0_45px_rgba(255,215,0,0.8)]">
                        {top1.name.charAt(0)}
                      </div>
                    </div>
                    <span className="text-sm sm:text-base font-black text-yellow-300 text-center truncate max-w-[110px] sm:max-w-[170px]">
                      {top1.name}
                    </span>
                    <span className="text-[10px] sm:text-xs text-yellow-400/80 font-mono block truncate max-w-[110px] sm:max-w-[170px]">
                      {top1.department || 'Grand Champion'}
                    </span>
                    <span className="text-sm sm:text-base font-mono text-yellow-400 font-black mb-3 mt-1">
                      {top1.score} PTS
                    </span>
                  </>
                ) : (
                  <div className="h-28" />
                )}
                <div className="w-full h-44 sm:h-56 rounded-t-3xl bg-gradient-to-b from-yellow-400/40 via-amber-900/40 to-[#030917] border-t-4 border-l border-r border-yellow-400 flex flex-col items-center justify-center shadow-[0_0_45px_rgba(255,215,0,0.4)]">
                  <Trophy className="w-10 h-10 text-yellow-400 mb-1 animate-pulse" />
                  <span className="text-2xl sm:text-4xl font-black font-mono text-yellow-300">1ST</span>
                  <span className="text-[10px] text-yellow-400 font-mono mt-0.5">CHAMPION</span>
                </div>
              </div>

              {/* 3rd Place Bronze */}
              <div className="flex flex-col items-center">
                {top3 ? (
                  <>
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-3xl bg-surface-dark border-4 border-amber-600 flex items-center justify-center font-black text-lg sm:text-2xl text-white shadow-[0_0_25px_rgba(205,127,50,0.5)] mb-3">
                      {top3.name.charAt(0)}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-white text-center truncate max-w-[95px] sm:max-w-[150px]">
                      {top3.name}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-400 font-mono block truncate max-w-[95px] sm:max-w-[150px]">
                      {top3.department || 'Gladiator'}
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-gray-200 font-black mb-3 mt-1">
                      {top3.score} PTS
                    </span>
                  </>
                ) : (
                  <div className="h-24" />
                )}
                <div className="w-full h-28 sm:h-36 rounded-t-3xl bg-gradient-to-b from-amber-600/40 via-surface-card to-[#030917] border-t-4 border-l border-r border-amber-600 flex flex-col items-center justify-center shadow-lg">
                  <Medal className="w-7 h-7 text-amber-500 mb-1" />
                  <span className="text-lg sm:text-2xl font-black font-mono text-white">3RD</span>
                  <span className="text-[10px] text-amber-500 font-mono mt-0.5">BRONZE</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. FULL PARTICIPANT LIST BELOW ORDERED BY POINTS */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel-sexy border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyber-cyan/20 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase">
                    ALL PARTICIPANTS FINAL RANKINGS ({leaderboard.length} Gladiators)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Complete standings ordered strictly by accumulated points and speed
                  </p>
                </div>
              </div>

              {session?.id && (
                <a
                  href={`/api/sessions/${session.id}/export?format=csv`}
                  className="px-4 py-2 rounded-xl bg-surface border border-white/15 text-xs font-mono font-bold text-gray-200 hover:text-white hover:border-cyber-cyan flex items-center gap-2 transition-all self-start sm:self-auto"
                >
                  <Download className="w-4 h-4 text-cyber-cyan" />
                  <span>Export CSV Results</span>
                </a>
              )}
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {leaderboard.map((p, idx) => {
                const rankNum = idx + 1;
                return (
                  <div
                    key={p.id || idx}
                    className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm transition-all ${
                      idx === 0
                        ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-surface-dark/90 border-amber-400/60 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        : idx === 1
                        ? 'bg-gradient-to-r from-slate-400/15 via-gray-500/10 to-surface-dark/90 border-slate-300/40 text-white'
                        : idx === 2
                        ? 'bg-gradient-to-r from-amber-700/20 via-orange-900/10 to-surface-dark/90 border-amber-600/40 text-white'
                        : 'bg-surface-dark/80 border-white/10 text-gray-300 hover:bg-surface/90 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs sm:text-sm ${
                          idx === 0
                            ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-surface-dark shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                            : idx === 1
                            ? 'bg-slate-300 text-surface-dark'
                            : idx === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-surface border border-white/10 text-gray-400'
                        }`}
                      >
                        #{rankNum}
                      </span>
                      <div>
                        <span className="font-extrabold text-white text-sm sm:text-base block truncate max-w-[160px] sm:max-w-[280px]">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                          {p.rollNumber && <span>Roll: <strong className="text-gray-300">{p.rollNumber}</strong> •</span>}
                          <span>{p.department || 'General'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 font-mono text-right">
                      <div className="hidden sm:block text-right">
                        <span className="text-[10px] text-gray-400 uppercase block">Accuracy</span>
                        <span className="text-xs text-cyber-green font-bold">
                          {p.correctCount || 0} Correct
                        </span>
                      </div>

                      {p.avgResponseTimeMs > 0 && (
                        <div className="hidden md:block text-right">
                          <span className="text-[10px] text-gray-400 uppercase block">Avg Speed</span>
                          <span className="text-xs text-gray-300 font-bold">
                            {(p.avgResponseTimeMs / 1000).toFixed(2)}s
                          </span>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase block">Final Score</span>
                        <span className="text-base sm:text-xl font-black text-cyber-cyan">
                          {p.score} <span className="text-xs text-gray-400 font-normal">PTS</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* ========================================================================= */
        /* ACTIVE / RUNNING STATE: SPLIT SCREEN (LEFT: QUESTION TELEMETRY, RIGHT: PODIUM) */
        /* ========================================================================= */
        <main className="flex-1 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start z-10">
          
          {/* LEFT PANEL (5 Cols): Live Question Telemetry, Attended/Unattended Counter & Options Distribution */}
          <section className="lg:col-span-5 space-y-4">
            {activeQuestion ? (
              <div className="p-5 sm:p-6 rounded-3xl glass-panel-glow border border-cyber-cyan/30 space-y-4 shadow-[0_0_35px_rgba(0,217,255,0.15)]">
                {/* Question Header & Circular Timer */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-xs uppercase font-mono font-black text-cyber-cyan tracking-wider block">
                      QUESTION {activeQuestion.index + 1} OF {activeQuestion.totalQuestions || 20}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5 block">
                      {activeQuestion.category || 'Robotics & Microcontrollers'}
                    </span>
                  </div>

                  <CircularTimer
                    remainingSeconds={remainingSeconds}
                    totalSeconds={totalSeconds}
                    size={68}
                    strokeWidth={6}
                  />
                </div>

                {/* Question Text */}
                <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                  {activeQuestion.text}
                </h2>

                {activeQuestion.codeSnippet && (
                  <CodeViewer code={activeQuestion.codeSnippet} />
                )}

                {/* Real-time Attended vs Not Attended Tile (Resets per Question!) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-cyber-green/10 border border-cyber-green/40 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-cyber-green text-[10px] font-mono font-bold uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attended (Answered)</span>
                    </div>
                    <div className="text-2xl font-mono font-black text-white mt-1">
                      {attendedCount} <span className="text-xs text-gray-400 font-normal">/ {totalParticipants}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-cyber-amber/10 border border-cyber-amber/40 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-cyber-amber text-[10px] font-mono font-bold uppercase">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Not Attended Till Now</span>
                    </div>
                    <div className="text-2xl font-mono font-black text-white mt-1">
                      {unattendedCount} <span className="text-xs text-gray-400 font-normal">Gladiators</span>
                    </div>
                  </div>
                </div>

                {/* Options Breakdown with Real-time Counts upon Close */}
                <div className="space-y-2 pt-1">
                  {activeQuestion.options?.map((opt: any, idx: number) => {
                    const count = distribution[opt.id] || 0;
                    const percent = attendedCount > 0 ? Math.round((count / attendedCount) * 100) : 0;
                    const isClosed = sessionStatus === 'QUESTION_CLOSED';
                    const isCorrect = closedData?.correctOptionIds?.includes(opt.id) || opt.isCorrect;

                    return (
                      <div
                        key={opt.id || idx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isClosed && isCorrect
                            ? 'border-cyber-green bg-cyber-green/20 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                            : 'border-white/10 bg-surface-dark/70 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isClosed && isCorrect
                              ? 'bg-cyber-green text-surface-dark font-black'
                              : 'bg-surface border border-white/10 text-cyber-cyan'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="leading-snug">{opt.text}</span>
                        </div>

                        {isClosed && (
                          <div className="flex items-center gap-2 font-mono text-[11px] flex-shrink-0">
                            <span className={isCorrect ? 'text-cyber-green font-black' : 'text-gray-400'}>
                              {count} ({percent}%)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Solution Explanation if closed */}
                {sessionStatus === 'QUESTION_CLOSED' && closedData?.explanation && (
                  <div className="p-3.5 rounded-xl bg-surface-dark/90 border border-cyber-cyan/30 text-xs text-gray-200 leading-relaxed">
                    <strong className="text-cyber-cyan block mb-1 font-mono uppercase text-[10px]">Explanation:</strong>
                    {closedData.explanation}
                  </div>
                )}

                {/* Auto-Pacing / Paused Review Timer Banner */}
                {sessionStatus === 'QUESTION_CLOSED' && (
                  <div
                    className={`p-3 rounded-2xl border text-center flex items-center justify-center gap-2.5 ${
                      isPaused
                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                        : 'bg-cyber-cyan/15 border-cyber-cyan/50 text-cyber-cyan animate-pulse'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPaused ? 'bg-amber-400' : 'bg-cyber-cyan animate-ping'
                      }`}
                    />
                    <span className="text-xs font-mono font-bold">
                      {isPaused
                        ? '⏸️ SESSION PAUSED BY HOST • Reviewing Standings (Waiting for Host to Resume)'
                        : closedData?.isLastQuestion
                        ? `🏆 Concluding Competition & Revealing Grand Champions in ${reviewRemaining}s...`
                        : `⚡ Question ${activeQuestion.index + 2} launching in ${reviewRemaining}s...`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 rounded-3xl glass-panel-glow text-center space-y-3">
                <Trophy className="w-12 h-12 text-cyber-cyan mx-auto animate-float" />
                <h3 className="text-lg font-bold text-white">Lobby / Waiting Room</h3>
                <p className="text-xs text-gray-400">
                  Question telemetry will broadcast on the left as soon as the quiz is launched by the administrator.
                </p>
              </div>
            )}

            {/* Question Top 3 Performers Strip (Below Left Question Card) */}
            {sessionStatus === 'QUESTION_CLOSED' && closedData?.topQuestionPerformers && closedData.topQuestionPerformers.length > 0 && (
              <div className="p-4 rounded-2xl bg-surface/90 border border-cyber-cyan/30 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-white/10 text-xs font-mono font-black uppercase text-cyber-cyan">
                  <span>⚡ Question #{activeQuestion?.index + 1} • Top 3 Fastest</span>
                  <span className="text-[10px] text-amber-300">Speed Champions</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {closedData.topQuestionPerformers.map((p: any, idx: number) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={p.participantId || idx} className="p-2 rounded-xl bg-surface-dark border border-white/10 text-center truncate">
                        <span className="text-base block">{medals[idx]}</span>
                        <span className="font-bold text-white block text-[11px] truncate mt-0.5">{p.name}</span>
                        <span className="text-[10px] text-cyber-cyan font-mono font-bold">{(p.responseTimeMs / 1000).toFixed(2)}s</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT PANEL (7 Cols): 3D Top 3 Podium + ALL Participants Ranked Table */}
          <section className="lg:col-span-7 space-y-5">
            {/* Top 3 3D Podium */}
            <div className="p-5 sm:p-6 rounded-3xl glass-panel-glow border border-amber-400/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-black text-amber-300 uppercase flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" /> Arena Champions Podium
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Real-time Ranking Engine</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto pt-4">
                {/* 2nd Place Silver Podium */}
                <div className="flex flex-col items-center">
                  {top2 ? (
                    <>
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-surface-dark border-2 border-gray-300 flex items-center justify-center font-black text-sm sm:text-base text-white shadow-[0_0_20px_rgba(192,192,192,0.4)] mb-2">
                        {top2.name.charAt(0)}
                      </div>
                      <span className="text-xs font-extrabold text-white text-center truncate max-w-[85px] sm:max-w-[120px]">
                        {top2.name}
                      </span>
                      <span className="text-[11px] font-mono text-gray-300 font-black mb-2">
                        {top2.score} pts
                      </span>
                    </>
                  ) : (
                    <div className="h-16" />
                  )}
                  <div className="w-full h-24 sm:h-32 rounded-t-2xl bg-gradient-to-b from-gray-400/40 via-surface-card to-[#030917] border-t-4 border-l border-r border-gray-400 flex flex-col items-center justify-center shadow-lg">
                    <Medal className="w-6 h-6 text-gray-300 mb-0.5" />
                    <span className="text-lg sm:text-xl font-black font-mono text-white">2ND</span>
                  </div>
                </div>

                {/* 1st Place Gold Champion Podium */}
                <div className="flex flex-col items-center">
                  {top1 ? (
                    <>
                      <div className="relative mb-2">
                        <Crown className="w-6 h-6 text-yellow-400 absolute -top-5 left-1/2 transform -translate-x-1/2 animate-bounce drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
                        <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-surface-dark border-4 border-yellow-400 flex items-center justify-center font-black text-base sm:text-xl text-yellow-300 shadow-[0_0_35px_rgba(255,215,0,0.7)]">
                          {top1.name.charAt(0)}
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-yellow-300 text-center truncate max-w-[100px] sm:max-w-[140px]">
                        {top1.name}
                      </span>
                      <span className="text-xs font-mono text-yellow-400 font-black mb-2">
                        {top1.score} pts
                      </span>
                    </>
                  ) : (
                    <div className="h-20" />
                  )}
                  <div className="w-full h-32 sm:h-44 rounded-t-2xl bg-gradient-to-b from-yellow-400/40 via-amber-900/30 to-[#030917] border-t-4 border-l border-r border-yellow-400 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(255,215,0,0.3)]">
                    <Trophy className="w-8 h-8 text-yellow-400 mb-0.5 animate-pulse" />
                    <span className="text-xl sm:text-2xl font-black font-mono text-yellow-300">1ST</span>
                  </div>
                </div>

                {/* 3rd Place Bronze Podium */}
                <div className="flex flex-col items-center">
                  {top3 ? (
                    <>
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-surface-dark border-2 border-amber-600 flex items-center justify-center font-black text-sm sm:text-base text-white shadow-[0_0_20px_rgba(205,127,50,0.4)] mb-2">
                        {top3.name.charAt(0)}
                      </div>
                      <span className="text-xs font-extrabold text-white text-center truncate max-w-[85px] sm:max-w-[120px]">
                        {top3.name}
                      </span>
                      <span className="text-[11px] font-mono text-gray-300 font-black mb-2">
                        {top3.score} pts
                      </span>
                    </>
                  ) : (
                    <div className="h-16" />
                  )}
                  <div className="w-full h-20 sm:h-26 rounded-t-2xl bg-gradient-to-b from-amber-600/40 via-surface-card to-[#030917] border-t-4 border-l border-r border-amber-600 flex flex-col items-center justify-center shadow-md">
                    <Medal className="w-5 h-5 text-amber-500 mb-0.5" />
                    <span className="text-base sm:text-lg font-black font-mono text-white">3RD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ALL PARTICIPANTS RANKINGS TABLE (Rank 1 to End) */}
            <div className="p-5 rounded-3xl glass-panel-sexy border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-mono font-black uppercase text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyber-cyan" />
                  All Session Gladiators ({leaderboard.length} Ranked)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Ordered by Total Score</span>
              </div>

              <div className="max-h-[380px] overflow-y-auto pr-1 space-y-1.5">
                {leaderboard.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 font-mono">
                    No participants registered in this session yet.
                  </div>
                ) : (
                  leaderboard.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        idx === 0
                          ? 'bg-yellow-500/10 border-yellow-400/40 text-yellow-200'
                          : idx === 1
                          ? 'bg-gray-400/10 border-gray-300/40 text-gray-200'
                          : idx === 2
                          ? 'bg-amber-600/10 border-amber-500/40 text-amber-200'
                          : 'bg-surface-dark/70 border-white/5 text-gray-300 hover:bg-surface/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                          idx < 3 ? 'bg-surface font-extrabold text-white' : 'text-gray-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white block text-xs truncate max-w-[140px] sm:max-w-[200px]">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono block">
                            {p.rollNumber ? `Roll: ${p.rollNumber} • ` : ''}{p.department || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 font-mono text-xs">
                        <span className="text-gray-400 hidden sm:inline">{p.correctCount || 0} Correct</span>
                        <span className="font-black text-cyber-cyan text-sm sm:text-base">
                          {p.score} pts
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500 z-10 font-mono">
        <span>ROBOQUEST Live Auditorium Engine • SESSION {sessionCode}</span>
        <span>Synchronized Real-Time Telemetry</span>
      </footer>
    </div>
  );
}

