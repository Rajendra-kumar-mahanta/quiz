'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Radio,
  Play,
  Pause,
  SkipForward,
  Trophy,
  QrCode,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  RotateCcw,
  ExternalLink,
  Download,
  AlertCircle,
  HelpCircle,
  Eye,
  Zap,
  Lock
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';
import { CircularTimer } from '@/components/ui/CircularTimer';
import { QRCodeModal } from '@/components/ui/QRCodeModal';
import { getSocketClient } from '@/lib/socket-client';

export default function AdminLiveSessionControlPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('WAITING_ROOM');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [totalSeconds, setTotalSeconds] = useState<number>(30);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [totalResponses, setTotalResponses] = useState<number>(0);
  const [questionResponses, setQuestionResponses] = useState<Record<string, any>>({});
  const [closedData, setClosedData] = useState<any>(null);
  const [reviewRemaining, setReviewRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPauseScheduled, setIsPauseScheduled] = useState<boolean>(false);

  const fetchSessionDetails = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        setSessionStatus(data.session.status);
        setParticipants(data.rankedParticipants || []);

        if (data.session.currentQuestionIndex >= 0 && data.session.sessionQuestions) {
          const sq = data.session.sessionQuestions[data.session.currentQuestionIndex];
          if (sq) {
            const qData = JSON.parse(sq.snapshotData);
            setCurrentQuestion({
              ...qData,
              index: data.session.currentQuestionIndex,
              totalQuestions: data.session.sessionQuestions.length,
              isClosed: sq.isClosed
            });
            setTotalSeconds(qData.duration || 30);

            // Extract responses for current question
            const respMap: Record<string, any> = {};
            if (sq.responses) {
              sq.responses.forEach((r: any) => {
                respMap[r.participantId] = r;
              });
              setTotalResponses(sq.responses.length);
            }
            setQuestionResponses(respMap);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  // Socket connection strictly bound to this session's code
  useEffect(() => {
    if (!session?.sessionCode) return;

    const socket = getSocketClient();

    socket.emit('session:join', {
      sessionCode: session.sessionCode,
      role: 'admin'
    });

    socket.on('session:state', (data: any) => {
      if (data.session) {
        setSessionStatus(data.session.status);
      }
      if (data.activeQuestion) {
        setCurrentQuestion(data.activeQuestion);
        setRemainingSeconds(data.session?.remainingSeconds || data.activeQuestion.duration || 30);
        setTotalSeconds(data.activeQuestion.duration || 30);
      }
      fetchSessionDetails();
    });

    socket.on('session:question_started', (data: any) => {
      setCurrentQuestion(data.question);
      setSessionStatus('ACTIVE_QUESTION');
      setRemainingSeconds(data.question.duration || 30);
      setTotalSeconds(data.question.duration || 30);
      setDistribution({});
      setTotalResponses(0);
      setQuestionResponses({});
      setClosedData(null);
      setReviewRemaining(0);
      setIsPaused(false);
      setIsPauseScheduled(false);
      fetchSessionDetails();
    });

    socket.on('session:timer_tick', (data: any) => {
      setRemainingSeconds(data.remainingSeconds);
      if (data.totalSeconds) setTotalSeconds(data.totalSeconds);
    });

    socket.on('session:review_tick', (data: any) => {
      setReviewRemaining(data.remainingSeconds);
    });

    socket.on('session:pause_scheduled', (data: any) => {
      setIsPauseScheduled(true);
      setIsPaused(false);
    });

    socket.on('session:paused', (data: any) => {
      setIsPaused(true);
      setIsPauseScheduled(false);
      setReviewRemaining(0);
    });

    socket.on('session:resumed', (data: any) => {
      setIsPaused(false);
      setIsPauseScheduled(false);
    });

    socket.on('admin:submission_update', (data: any) => {
      setTotalResponses(data.totalResponses);
      fetchSessionDetails();
    });

    socket.on('session:question_closed', (data: any) => {
      setSessionStatus('QUESTION_CLOSED');
      setClosedData(data);
      if (data.optionDistribution) setDistribution(data.optionDistribution);
      if (data.totalResponses !== undefined) setTotalResponses(data.totalResponses);
      if (data.reviewSeconds && !isPaused) setReviewRemaining(data.reviewSeconds);
      fetchSessionDetails();
    });

    socket.on('session:participant_joined', () => {
      fetchSessionDetails();
    });

    return () => {
      socket.off('session:state');
      socket.off('session:question_started');
      socket.off('session:timer_tick');
      socket.off('session:review_tick');
      socket.off('session:pause_scheduled');
      socket.off('session:paused');
      socket.off('session:resumed');
      socket.off('admin:submission_update');
      socket.off('session:question_closed');
      socket.off('session:participant_joined');
    };
  }, [session?.sessionCode, isPaused]);

  const handleSessionAction = async (action: string, payload: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await res.json();
      if (data.success) {
        await fetchSessionDetails();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Error executing action');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-cyber-cyan font-mono">Connecting to Live Mission Control...</div>;
  }

  const currentQIndex = session?.currentQuestionIndex ?? -1;
  const totalQuestionsCount = session?.sessionQuestions?.length || 0;
  const isLastQuestion = currentQIndex >= totalQuestionsCount - 1;

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title={`Mission Control: ${session?.title || 'Live Session'}`}
        subtitle={`Session PIN: ${session?.sessionCode} • Quiz: ${session?.quiz?.title} • Status: ${sessionStatus}`}
        actions={
          <div className="flex items-center gap-2">
            <CyberButton
              variant="outline"
              size="sm"
              onClick={() => setIsQRModalOpen(true)}
              icon={<QrCode className="w-4 h-4" />}
            >
              Session QR
            </CyberButton>
            <Link href={`/leaderboard/${session?.sessionCode}`} target="_blank">
              <CyberButton variant="cyan" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                Live Podium
              </CyberButton>
            </Link>
          </div>
        }
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Live Control Command Strip */}
        <div className="p-6 rounded-2xl bg-surface-card border border-cyber-cyan/40 shadow-[0_0_30px_rgba(0,217,255,0.15)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 ${
                sessionStatus === 'ACTIVE_QUESTION'
                  ? 'bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan animate-pulse'
                  : sessionStatus === 'QUESTION_CLOSED'
                  ? 'bg-cyber-amber/20 border border-cyber-amber text-cyber-amber'
                  : sessionStatus === 'COMPLETED'
                  ? 'bg-cyber-green/20 border border-cyber-green text-cyber-green'
                  : 'bg-surface border border-surface-border text-gray-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              {sessionStatus}
            </span>

            <span className="text-xs font-mono text-gray-300">
              👥 <strong>{participants.length}</strong> Participants in this Session
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {sessionStatus === 'WAITING_ROOM' && (
              <CyberButton
                variant="cyan"
                size="md"
                loading={actionLoading}
                onClick={() => handleSessionAction('START_SESSION')}
                icon={<Play className="w-4 h-4" />}
              >
                Start Quiz (Question 1)
              </CyberButton>
            )}

            {sessionStatus === 'ACTIVE_QUESTION' && (
              <>
                {isPauseScheduled ? (
                  <CyberButton
                    variant="amber"
                    size="md"
                    loading={actionLoading}
                    onClick={() => handleSessionAction('RESUME_SESSION')}
                    icon={<Play className="w-4 h-4" />}
                    title="Pause scheduled. Click to cancel."
                  >
                    ⏸️ Pause Scheduled (Cancel)
                  </CyberButton>
                ) : (
                  <CyberButton
                    variant="outline"
                    size="md"
                    loading={actionLoading}
                    onClick={() => handleSessionAction('PAUSE_SESSION')}
                    icon={<Pause className="w-4 h-4 text-cyber-amber" />}
                    title="Pause will activate after the question timer completes, before the next question countdown starts."
                  >
                    Pause After Timer
                  </CyberButton>
                )}

                <CyberButton
                  variant="red"
                  size="md"
                  loading={actionLoading}
                  onClick={() => handleSessionAction('CLOSE_QUESTION')}
                  icon={<Pause className="w-4 h-4" />}
                >
                  Close Question Early
                </CyberButton>
              </>
            )}

            {(sessionStatus === 'QUESTION_CLOSED' || sessionStatus === 'SHOW_LEADERBOARD') && !isLastQuestion && (
              <>
                {isPaused ? (
                  <CyberButton
                    variant="green"
                    size="md"
                    loading={actionLoading}
                    onClick={() => handleSessionAction('RESUME_SESSION')}
                    icon={<Play className="w-4 h-4" />}
                  >
                    ▶️ Resume (5s Countdown)
                  </CyberButton>
                ) : (
                  <CyberButton
                    variant="amber"
                    size="md"
                    loading={actionLoading}
                    onClick={() => handleSessionAction('PAUSE_SESSION')}
                    icon={<Pause className="w-4 h-4" />}
                  >
                    Pause Auto-Pacing
                  </CyberButton>
                )}

                <CyberButton
                  variant="cyan"
                  size="md"
                  loading={actionLoading}
                  onClick={() => handleSessionAction('NEXT_QUESTION', { questionIndex: currentQIndex + 1 })}
                  icon={<SkipForward className="w-4 h-4" />}
                >
                  Release Question {currentQIndex + 2}
                </CyberButton>
              </>
            )}

            {sessionStatus === 'QUESTION_CLOSED' && (
              <CyberButton
                variant="violet"
                size="md"
                loading={actionLoading}
                onClick={() => handleSessionAction('SHOW_LEADERBOARD')}
                icon={<Trophy className="w-4 h-4" />}
              >
                Broadcast Leaderboard
              </CyberButton>
            )}

            {(sessionStatus === 'QUESTION_CLOSED' || sessionStatus === 'SHOW_LEADERBOARD') && isLastQuestion && (
              <CyberButton
                variant="green"
                size="md"
                loading={actionLoading}
                onClick={() => handleSessionAction('COMPLETE_SESSION')}
                icon={<Trophy className="w-4 h-4" />}
              >
                Conclude Competition
              </CyberButton>
            )}

            <button
              onClick={() => {
                if (confirm('Reset this session to waiting room and clear participant scores for this session?')) {
                  handleSessionAction('RESET_SESSION');
                }
              }}
              className="p-2.5 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-400 hover:text-cyber-red transition-all"
              title="Reset This Session"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Post-Question Live Review Highlights */}
        {sessionStatus === 'QUESTION_CLOSED' && (
          <div className="space-y-4 animate-fade-in">
            {/* Auto-Pacing Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,217,255,0.2)] ${
                isPaused
                  ? 'bg-cyber-amber/15 border-cyber-amber/50'
                  : 'bg-cyber-cyan/15 border-cyber-cyan/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full animate-ping ${
                    isPaused ? 'bg-cyber-amber' : 'bg-cyber-cyan'
                  }`}
                />
                <span className="text-xs sm:text-sm font-mono font-bold text-white">
                  {isPaused
                    ? '⏸️ SESSION PAUSED: Reviewing Standings (Click Resume or Release Next Question)'
                    : isLastQuestion
                    ? `🏆 AUTO-PACING: Concluding Competition & Final Podium in ${reviewRemaining}s...`
                    : `⚡ AUTO-PACING: Next Question releasing automatically in ${reviewRemaining}s...`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isLastQuestion && isPaused && (
                  <CyberButton
                    variant="green"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleSessionAction('RESUME_SESSION')}
                    icon={<Play className="w-4 h-4" />}
                  >
                    Resume Countdown
                  </CyberButton>
                )}
                {!isLastQuestion && !isPaused && (
                  <CyberButton
                    variant="cyan"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleSessionAction('NEXT_QUESTION', { questionIndex: currentQIndex + 1 })}
                    icon={<SkipForward className="w-3.5 h-3.5" />}
                  >
                    Release Next Now
                  </CyberButton>
                )}
              </div>
            </div>

            {/* 1. ON TOP: Current Overall Leader */}
            {closedData?.overallLeader && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-surface-dark font-black text-lg shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                    👑
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono font-black tracking-wider text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/30">
                      CURRENT OVERALL LEADER
                    </span>
                    <span className="text-base font-extrabold text-white block mt-0.5">
                      {closedData.overallLeader.name} ({closedData.overallLeader.department})
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-gray-400 block">Total Accumulated Score</span>
                  <span className="text-lg font-mono font-black text-amber-300">
                    {closedData.overallLeader.score} PTS
                  </span>
                </div>
              </div>
            )}

            {/* 2. BELOW: Top 3 for THIS Specific Question */}
            {closedData?.topQuestionPerformers && closedData.topQuestionPerformers.length > 0 && (
              <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-3">
                <span className="text-xs font-mono font-black uppercase text-cyber-cyan flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyber-amber" />
                  Question #{currentQIndex + 1} • Top 3 Fastest Correct Responders
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {closedData.topQuestionPerformers.map((p: any, idx: number) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div
                        key={p.participantId || idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                          idx === 0
                            ? 'bg-amber-500/10 border-amber-400/40 text-amber-200'
                            : 'bg-surface-dark border-surface-border text-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{medals[idx]}</span>
                          <div>
                            <span className="font-bold text-white block">{p.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ⏱️ {(p.responseTimeMs / 1000).toFixed(2)}s response
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono font-black text-cyber-cyan">
                          +{p.totalMarks} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Question Display & Real-time Distribution Chart */}
        {currentQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Active Question Details */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <span className="text-xs font-mono font-bold text-cyber-cyan uppercase">
                  Question {currentQuestion.index !== undefined ? currentQuestion.index + 1 : currentQIndex + 1} of {totalQuestionsCount}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-surface border border-surface-border text-xs text-cyber-violet font-semibold">
                  {currentQuestion.category || 'Robotics'}
                </span>
              </div>

              <h2 className="text-lg md:text-xl font-extrabold text-white leading-relaxed">
                {currentQuestion.text}
              </h2>

              {/* Options Breakdown with Real-time Counts */}
              <div className="space-y-2.5 pt-2">
                {currentQuestion.options?.map((opt: any, idx: number) => {
                  const count = distribution[opt.id] || 0;
                  const percent = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                  const isCorrect = opt.isCorrect;

                  return (
                    <div
                      key={opt.id || idx}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isCorrect && sessionStatus === 'QUESTION_CLOSED'
                          ? 'border-cyber-green bg-cyber-green/15 text-white font-bold'
                          : 'border-surface-border bg-surface-dark/80 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center font-bold text-xs text-cyber-cyan">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-xs sm:text-sm">{opt.text}</span>
                        {isCorrect && sessionStatus === 'QUESTION_CLOSED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-green/30 text-cyber-green uppercase font-bold">
                            CORRECT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-gray-400">{count} answers ({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentQuestion.explanation && sessionStatus === 'QUESTION_CLOSED' && (
                <div className="p-4 rounded-xl bg-cyber-amber/10 border border-cyber-amber/30 text-xs text-cyber-amber leading-relaxed">
                  <strong className="block mb-1">Explanation:</strong>
                  {currentQuestion.explanation}
                </div>
              )}
            </div>

            {/* Right: Real-time Live Timer & Responses Meter */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col items-center justify-center text-center space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-3">
                  Synchronized Server Countdown
                </span>
                <CircularTimer
                  remainingSeconds={remainingSeconds}
                  totalSeconds={totalSeconds}
                  size={140}
                  strokeWidth={10}
                />
              </div>

              <div className="w-full pt-4 border-t border-surface-border grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
                  <span className="text-[10px] uppercase text-gray-400 font-semibold">Submissions</span>
                  <div className="text-xl font-mono font-extrabold text-cyber-cyan mt-0.5">
                    {totalResponses} / {participants.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
                  <span className="text-[10px] uppercase text-gray-400 font-semibold">Response Rate</span>
                  <div className="text-xl font-mono font-extrabold text-cyber-green mt-0.5">
                    {participants.length > 0 ? Math.round((totalResponses / participants.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Participants Master Grid - Strictly for THIS session */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyber-cyan" />
              Session Participants ({participants.length}) • Live Response Tracking
            </h3>
            <a
              href={`/api/sessions/${sessionId}/export?format=csv`}
              className="text-xs text-cyber-cyan hover:underline font-semibold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download Session Results CSV
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-dark text-gray-400 uppercase tracking-wider border-b border-surface-border font-semibold">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Participant Name</th>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Current Q Status</th>
                  <th className="p-3">Accuracy</th>
                  <th className="p-3 text-right">Session Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      No participants have joined this session yet. Project the QR code or share PIN <strong>{session?.sessionCode}</strong>.
                    </td>
                  </tr>
                ) : (
                  participants.map((p, idx) => {
                    const resp = questionResponses[p.id];
                    const isAnswered = Boolean(resp);
                    return (
                      <tr key={p.id || idx} className="hover:bg-surface/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-cyber-cyan">
                          #{idx + 1}
                        </td>
                        <td className="p-3 font-bold text-white">
                          {p.name}
                        </td>
                        <td className="p-3 font-mono text-gray-400">
                          {p.rollNumber || '—'}
                        </td>
                        <td className="p-3 text-gray-300">
                          {p.department || 'General'}
                        </td>
                        <td className="p-3">
                          {sessionStatus === 'ACTIVE_QUESTION' ? (
                            isAnswered ? (
                              <span className="px-2 py-0.5 rounded bg-cyber-green/15 text-cyber-green font-bold text-[10px] flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3" /> Answer Locked ({(resp.responseTimeMs / 1000).toFixed(1)}s)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan font-semibold text-[10px] flex items-center gap-1 animate-pulse w-max">
                                Thinking...
                              </span>
                            )
                          ) : sessionStatus === 'QUESTION_CLOSED' ? (
                            isAnswered ? (
                              resp.isCorrect ? (
                                <span className="px-2 py-0.5 rounded bg-cyber-green/20 text-cyber-green font-bold text-[10px] flex items-center gap-1 w-max">
                                  <CheckCircle2 className="w-3 h-3" /> Correct (+{resp.totalMarks} pts)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-cyber-red/20 text-cyber-red font-bold text-[10px] flex items-center gap-1 w-max">
                                  <XCircle className="w-3 h-3" /> Incorrect (+0 pts)
                                </span>
                              )
                            ) : (
                              <span className="text-gray-500 text-[10px]">Unanswered</span>
                            )
                          ) : (
                            <span className="text-gray-500 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-gray-300">
                          {p.correctCount || 0} Correct
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-cyber-cyan text-sm">
                          {p.score !== undefined ? p.score : p.totalScore || 0} pts
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Projection QR Modal */}
      {session && (
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          sessionCode={session.sessionCode}
          quizTitle={session.title}
          joinPin={session.joinPin}
          participantCount={participants.length}
        />
      )}
    </div>
  );
}
