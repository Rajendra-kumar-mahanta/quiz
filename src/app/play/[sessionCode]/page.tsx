'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  Zap,
  Radio,
  BarChart2,
  Award,
  Lock,
  Flame,
  Volume2
} from 'lucide-react';
import { getSocketClient } from '@/lib/socket-client';
import { sounds } from '@/lib/audio';
import { CircularTimer } from '@/components/ui/CircularTimer';
import { CodeViewer } from '@/components/ui/CodeViewer';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { CyberButton } from '@/components/ui/CyberButton';

export default function PlayQuizPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = (params.sessionCode as string)?.toUpperCase();

  // Participant & Session State
  const [session, setSession] = useState<any>(null);
  const [quizInfo, setQuizInfo] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [participantToken, setParticipantToken] = useState<string>('');
  
  // Real-time Game State
  const [sessionStatus, setSessionStatus] = useState<string>('WAITING_ROOM');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [totalSeconds, setTotalSeconds] = useState<number>(30);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [questionFeedback, setQuestionFeedback] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [finalRankings, setFinalRankings] = useState<any[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [reviewRemaining, setReviewRemaining] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Initialize socket and load session token
  useEffect(() => {
    if (!sessionCode) return;

    const token = localStorage.getItem(`roboquest_token_${sessionCode}`);
    if (!token) {
      router.push(`/join/${sessionCode}`);
      return;
    }
    setParticipantToken(token);

    const socket = getSocketClient();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('session:join', {
        sessionCode,
        role: 'participant',
        participantToken: token
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Session State Sync
    socket.on('session:state', (data: any) => {
      if (data.session) {
        setSession(data.session);
        setSessionStatus(data.session.status);
      }
      if (data.quiz) setQuizInfo(data.quiz);
      if (data.participant) setParticipant(data.participant);
      if (data.leaderboard) setLeaderboard(data.leaderboard);

      if (data.activeQuestion) {
        setCurrentQuestion(data.activeQuestion);
        setRemainingSeconds(data.session.remainingSeconds || data.activeQuestion.duration || 30);
        setTotalSeconds(data.activeQuestion.duration || 30);

        if (data.userSubmission) {
          setSubmitted(true);
          setSelectedOptionIds(data.userSubmission.selectedOptionIds || []);
          setSubmissionResult({
            isCorrect: data.userSubmission.isCorrect,
            totalMarks: data.userSubmission.totalMarks,
            baseMarks: data.userSubmission.baseMarks,
            speedBonus: data.userSubmission.speedBonus,
            responseTimeMs: data.userSubmission.responseTimeMs
          });
        } else {
          setSubmitted(false);
          setSelectedOptionIds([]);
          setSubmissionResult(null);
        }
      }
    });

    // New Question Started
    socket.on('session:question_started', (data: any) => {
      sounds.playStart();
      setCurrentQuestion(data.question);
      setSessionStatus('ACTIVE_QUESTION');
      setRemainingSeconds(data.question.duration || 30);
      setTotalSeconds(data.question.duration || 30);
      setSelectedOptionIds([]);
      setSubmitted(false);
      setSubmissionResult(null);
      setQuestionFeedback(null);
      setReviewRemaining(0);
      setIsPaused(false);
    });

    // Live Timer Tick
    socket.on('session:timer_tick', (data: any) => {
      setRemainingSeconds(data.remainingSeconds);
      if (data.totalSeconds) setTotalSeconds(data.totalSeconds);
    });

    // Auto-advance review tick
    socket.on('session:review_tick', (data: any) => {
      setReviewRemaining(data.remainingSeconds);
      if (data.remainingSeconds <= 5 && data.remainingSeconds > 0) {
        sounds.playTick(true);
      }
    });

    socket.on('session:paused', () => {
      setIsPaused(true);
      setReviewRemaining(0);
    });

    socket.on('session:resumed', () => {
      setIsPaused(false);
    });

    // Question Closed by Server (Score calculated & revealed at timer completion)
    socket.on('session:question_closed', (data: any) => {
      setSessionStatus('QUESTION_CLOSED');
      setQuestionFeedback(data);
      if (data.reviewSeconds) setReviewRemaining(data.reviewSeconds);

      // Extract participant's score calculated at timer completion
      const myId = participant?.id || (data.leaderboard && data.leaderboard.find((p: any) => p.name === participant?.name)?.id);
      let myResult = null;
      if (data.userResultsMap) {
        if (myId && data.userResultsMap[myId]) {
          myResult = data.userResultsMap[myId];
        } else {
          // Check by iteration if ID matches
          for (const key of Object.keys(data.userResultsMap)) {
            if (participant?.id && key === participant.id) {
              myResult = data.userResultsMap[key];
              break;
            }
          }
        }
      }

      if (myResult) {
        setSubmissionResult(myResult);
        if (myResult.isCorrect) {
          sounds.playCorrect();
        } else {
          sounds.playIncorrect();
        }
      } else {
        setSubmissionResult({
          isCorrect: false,
          totalMarks: 0,
          baseMarks: 0,
          speedBonus: 0,
          responseTimeMs: 0
        });
        sounds.playIncorrect();
      }

      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
        const myRanked = data.leaderboard.find((p: any) => p.id === participant?.id || p.name === participant?.name);
        if (myRanked) {
          setParticipant((prev: any) => ({
            ...prev,
            totalScore: myRanked.score,
            correctCount: myRanked.correctCount,
            rank: myRanked.rank
          }));
        }
      }
    });

    // Submission Confirmation (Locks submission, score computed when timer expires)
    socket.on('submission:success', (data: any) => {
      setSubmitted(true);
      setSubmitting(false);
      sounds.playClick();
    });

    socket.on('submission:already_submitted', () => {
      setSubmitted(true);
      setSubmitting(false);
    });

    socket.on('submission:error', (data: any) => {
      setSubmitting(false);
      alert(data.message || 'Submission error');
    });

    // Leaderboard Broadcast
    socket.on('session:leaderboard', (data: any) => {
      setSessionStatus('SHOW_LEADERBOARD');
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    });

    // Completed Broadcast
    socket.on('session:completed', (data: any) => {
      setSessionStatus('COMPLETED');
      if (data.finalRankings) setFinalRankings(data.finalRankings);
      sounds.playVictory();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    });

    // Participant Count Update
    socket.on('session:participant_count', (data: any) => {
      setParticipantCount(data.count || 1);
    });

    if (socket.connected) {
      socket.emit('session:join', {
        sessionCode,
        role: 'participant',
        participantToken: token
      });
    }

    return () => {
      socket.off('session:state');
      socket.off('session:question_started');
      socket.off('session:timer_tick');
      socket.off('session:question_closed');
      socket.off('submission:success');
      socket.off('submission:already_submitted');
      socket.off('submission:error');
      socket.off('session:leaderboard');
      socket.off('session:completed');
      socket.off('session:participant_count');
    };
  }, [sessionCode, router]);

  // Handle option selection
  const handleToggleOption = (optId: string) => {
    if (submitted || sessionStatus !== 'ACTIVE_QUESTION') return;

    sounds.playClick();
    if (currentQuestion?.type === 'MCQ_MULTIPLE') {
      if (selectedOptionIds.includes(optId)) {
        setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optId));
      } else {
        setSelectedOptionIds([...selectedOptionIds, optId]);
      }
    } else {
      setSelectedOptionIds([optId]);
    }
  };

  // Submit Answer to Server
  const handleSubmitAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitted || submitting || selectedOptionIds.length === 0 || sessionStatus !== 'ACTIVE_QUESTION') return;

    setSubmitting(true);
    const socket = getSocketClient();
    socket.emit('participant:submit_answer', {
      sessionCode,
      participantToken,
      selectedOptionIds,
      clientTimestamp: Date.now()
    });
  };

  const handleDirectSingleSubmit = (optId: string) => {
    if (submitted || submitting || sessionStatus !== 'ACTIVE_QUESTION') return;
    sounds.playClick();
    setSelectedOptionIds([optId]);
    setSubmitting(true);

    const socket = getSocketClient();
    socket.emit('participant:submit_answer', {
      sessionCode,
      participantToken,
      selectedOptionIds: [optId],
      clientTimestamp: Date.now()
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-3 sm:p-6 select-none max-w-4xl mx-auto w-full relative">
      {/* Glow Orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyber-violet/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Status Header */}
      <header className="flex items-center justify-between py-3 px-5 rounded-2xl glass-panel-sexy backdrop-blur-2xl mb-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyber-cyan to-cyber-violet flex items-center justify-center text-surface-dark font-extrabold text-sm shadow-[0_0_15px_rgba(0,217,255,0.5)]">
            {participant?.name ? participant.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <span className="text-sm font-extrabold text-white block truncate max-w-[140px] sm:max-w-[220px]">
              {participant?.name || 'Participant'}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-gray-400">SCORE:</span>
              <span className="text-cyber-cyan font-extrabold">{participant?.totalScore || 0} PTS</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-dark/90 border border-white/10 text-[10px] font-mono font-bold">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyber-green animate-ping' : 'bg-cyber-red'}`} />
            <span className="text-gray-300 hidden sm:inline">{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
          </div>
          <SoundToggle />
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col justify-center z-10">
        {/* 1. WAITING ROOM SCREEN */}
        {sessionStatus === 'WAITING_ROOM' && (
          <div className="p-8 sm:p-14 rounded-3xl glass-panel-glow text-center backdrop-blur-2xl relative overflow-hidden">
            <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyber-cyan/40 animate-ping opacity-40" />
              <div className="absolute inset-2 rounded-full border border-cyber-violet/50 animate-pulse" />
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyber-cyan via-blue-500 to-cyber-violet flex items-center justify-center shadow-[0_0_35px_rgba(0,217,255,0.7)]">
                <Radio className="w-10 h-10 text-surface-dark stroke-[2.5]" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan text-xs font-mono font-black uppercase tracking-wider mb-4 shadow-[0_0_15px_rgba(0,217,255,0.3)]">
              ARENA LOBBY • SESSION {sessionCode}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white mb-3 tracking-tight">
              {quizInfo?.title || 'Robotics & Arduino Workshop Challenge'}
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-lg mx-auto mb-8 font-light leading-relaxed">
              You are connected to the central competition server. The host will start the countdown shortly!
            </p>

            <div className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[#030917] border border-cyber-cyan/30 text-sm mb-8 shadow-inner">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-green" />
              </span>
              <span className="text-gray-300 font-semibold">
                <span className="text-white font-mono font-extrabold text-lg">{participantCount}</span> Gladiators in Lobby
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-dark/70 border border-white/10 text-left text-xs text-gray-400 max-w-lg mx-auto space-y-2">
              <div className="flex items-center gap-2 text-cyber-cyan font-bold font-mono">
                <Zap className="w-4 h-4 text-cyber-amber" />
                <span>SCORING & SPEED BONUS RULES</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-gray-300 text-xs">
                <li>Correct Answers: <strong className="text-white">10 Base Marks</strong>.</li>
                <li>Speed Bonus: Up to <strong className="text-cyber-cyan">+10 Bonus Marks</strong> based on remaining time.</li>
                <li>Deadlines are strictly locked on the server.</li>
              </ul>
            </div>
          </div>
        )}

        {/* 2. ACTIVE QUESTION SCREEN */}
        {sessionStatus === 'ACTIVE_QUESTION' && currentQuestion && (
          <div className="space-y-4 animate-fade-in">
            {/* Top Bar with Question Counter & Circular Countdown */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl glass-panel-sexy">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-cyber-cyan font-black font-mono">
                    QUESTION {currentQuestion.index + 1} OF {currentQuestion.totalQuestions}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet font-bold">
                    {currentQuestion.category || 'General'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1 font-medium">
                  {currentQuestion.type === 'MCQ_MULTIPLE'
                    ? 'Select all matching answers and lock your submission'
                    : 'Tap an option to lock in your answer'}
                </div>
              </div>

              <CircularTimer
                remainingSeconds={remainingSeconds}
                totalSeconds={totalSeconds}
                size={78}
                strokeWidth={7}
              />
            </div>

            {/* Question Text & Code Box */}
            <div className="p-6 sm:p-8 rounded-3xl glass-panel-glow relative">
              <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-snug">
                {currentQuestion.text}
              </h2>

              {currentQuestion.codeSnippet && (
                <CodeViewer code={currentQuestion.codeSnippet} />
              )}
            </div>

            {/* Answer Option Holographic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentQuestion.options?.map((option: any, idx: number) => {
                const isSelected = selectedOptionIds.includes(option.id);
                let indicatorLetter = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={option.id || idx}
                    type="button"
                    disabled={submitted}
                    onClick={() => {
                      if (currentQuestion.type === 'MCQ_MULTIPLE') {
                        handleToggleOption(option.id);
                      } else {
                        handleDirectSingleSubmit(option.id);
                      }
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center gap-4 active:scale-[0.97] disabled:pointer-events-none touch-manipulation select-none outline-none focus:outline-none ${
                      isSelected
                        ? 'border-cyber-cyan bg-cyber-cyan/25 text-white shadow-[0_0_25px_rgba(0,217,255,0.6)] font-bold ring-2 ring-cyber-cyan'
                        : 'border-white/10 bg-surface-dark/80 text-gray-200'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-cyber-cyan text-surface-dark shadow-[0_0_10px_rgba(0,217,255,0.8)]'
                          : 'bg-surface border border-white/15 text-gray-300'
                      }`}
                    >
                      {indicatorLetter}
                    </span>
                    <span className="text-sm sm:text-base flex-1 leading-snug font-medium">
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Multiple-select Submit Action */}
            {currentQuestion.type === 'MCQ_MULTIPLE' && !submitted && (
              <CyberButton
                variant="cyan"
                size="lg"
                onClick={handleSubmitAnswer}
                disabled={selectedOptionIds.length === 0 || submitting}
                loading={submitting}
                className="w-full mt-2"
                icon={<Lock className="w-5 h-5" />}
              >
                Lock & Submit Answer ({selectedOptionIds.length} Selected)
              </CyberButton>
            )}

            {/* Submission Locked In Status */}
            {submitted && (
              <div className="p-4 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/50 text-center animate-pulse shadow-[0_0_20px_rgba(0,217,255,0.3)]">
                <div className="flex items-center justify-center gap-2 text-cyber-cyan font-black text-sm uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>Answer Received & Locked in Server</span>
                </div>
                <p className="text-xs text-gray-300 mt-1 font-mono">
                  Server timestamp recorded. Scores will calculate when the timer completes!
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2.5 DEDICATED SINGLE-PAGE ROUND REVIEW & LEADERBOARD (NO SCROLL REQUIRED) */}
        {sessionStatus === 'QUESTION_CLOSED' && (
          <div className="space-y-2.5 sm:space-y-3 animate-fade-in flex flex-col justify-center">
            
            {/* 1. TOP SECTION: OVERALL ARENA LEADERBOARD TOP 3 & YOUR STANDING */}
            <div className="p-3.5 sm:p-4 rounded-2xl glass-panel-glow relative overflow-hidden space-y-2 border border-amber-400/30">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                    MAIN LEADERBOARD (TOP 3 OVERALL)
                  </h3>
                </div>

                {/* Participant's current overall rank pill */}
                <div className="px-2.5 py-1 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 text-right">
                  <span className="text-[11px] font-mono font-black text-cyber-cyan">
                    Your Rank: #{participant?.rank || (leaderboard.findIndex((p: any) => p.id === participant?.id) + 1) || 1} • {participant?.totalScore || 0} PTS
                  </span>
                </div>
              </div>

              {/* Top 3 Champion Cards (Compact 3-Column Grid) */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1st Place Champion */}
                {leaderboard[0] ? (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-amber-500/20 via-yellow-500/10 to-surface-dark/90 border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.2)] relative flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-amber-300">👑 1ST</span>
                      <span className="text-xs font-mono font-black text-amber-300">{leaderboard[0].score} PTS</span>
                    </div>
                    <div className="mt-1 truncate">
                      <span className="font-extrabold text-white text-xs block truncate">
                        {leaderboard[0].name}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono block truncate">
                        {leaderboard[0].department || 'Gladiator'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-surface-dark/60 border border-white/10 text-center text-[10px] text-gray-500 font-mono flex items-center justify-center">
                    Awaiting 1st
                  </div>
                )}

                {/* 2nd Place */}
                {leaderboard[1] ? (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-slate-400/15 via-gray-500/10 to-surface-dark/90 border border-slate-300/40 shadow-[0_0_10px_rgba(203,213,225,0.15)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-slate-300">🥈 2ND</span>
                      <span className="text-xs font-mono font-black text-slate-200">{leaderboard[1].score} PTS</span>
                    </div>
                    <div className="mt-1 truncate">
                      <span className="font-extrabold text-white text-xs block truncate">
                        {leaderboard[1].name}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono block truncate">
                        {leaderboard[1].department || 'Gladiator'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-surface-dark/60 border border-white/10 text-center text-[10px] text-gray-500 font-mono flex items-center justify-center">
                    Awaiting 2nd
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] ? (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-amber-700/20 via-orange-900/10 to-surface-dark/90 border border-amber-600/40 shadow-[0_0_10px_rgba(180,83,9,0.15)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-amber-400">🥉 3RD</span>
                      <span className="text-xs font-mono font-black text-amber-300">{leaderboard[2].score} PTS</span>
                    </div>
                    <div className="mt-1 truncate">
                      <span className="font-extrabold text-white text-xs block truncate">
                        {leaderboard[2].name}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono block truncate">
                        {leaderboard[2].department || 'Gladiator'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-surface-dark/60 border border-white/10 text-center text-[10px] text-gray-500 font-mono flex items-center justify-center">
                    Awaiting 3rd
                  </div>
                )}
              </div>
            </div>

            {/* 2. MIDDLE SECTION: THIS QUESTION'S SPEED DEMONS (TOP 3 FASTEST CORRECT) */}
            <div className="p-3 sm:p-3.5 rounded-2xl glass-panel-sexy space-y-1.5 border border-cyber-cyan/30">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyber-amber" />
                  <h4 className="text-[11px] sm:text-xs font-black uppercase text-cyber-cyan font-mono tracking-wider">
                    QUESTION #{currentQuestion ? currentQuestion.index + 1 : 1} SPEED DEMONS (TOP 3)
                  </h4>
                </div>
                <span className="text-[9px] text-cyber-amber font-mono font-bold uppercase bg-cyber-amber/10 px-1.5 py-0.5 rounded border border-cyber-amber/30">
                  ⚡ SPEED BONUS
                </span>
              </div>

              {(!questionFeedback?.topQuestionPerformers || questionFeedback.topQuestionPerformers.length === 0) ? (
                <div className="py-2 text-center text-[11px] text-gray-400 font-mono">
                  No correct answers recorded for this round.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {questionFeedback.topQuestionPerformers.map((p: any, idx: number) => {
                    const isMe = p.participantId === participant?.id;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div
                        key={p.participantId || idx}
                        className={`p-2 rounded-xl border flex flex-col justify-between text-xs transition-all ${
                          isMe
                            ? 'bg-cyber-cyan/20 border-cyber-cyan text-white shadow-[0_0_15px_rgba(0,217,255,0.3)]'
                            : idx === 0
                            ? 'bg-gradient-to-b from-amber-500/15 to-surface-dark/80 border-amber-400/40 text-amber-200'
                            : 'bg-surface-dark/80 border-white/10 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{medals[idx]}</span>
                          <span className="text-[10px] font-mono font-black text-cyber-cyan">+{p.totalMarks} PTS</span>
                        </div>
                        <div className="mt-1 truncate">
                          <span className="font-extrabold text-white text-[11px] block truncate">
                            {p.name} {isMe && <span className="text-cyber-cyan font-black text-[9px]">(You)</span>}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {(p.responseTimeMs / 1000).toFixed(2)}s (Bonus +{p.speedBonus})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. LOWER SECTION: PERSONAL QUESTION PERFORMANCE & EXTRA POINTS BREAKDOWN */}
            <div
              className={`p-3 sm:p-3.5 rounded-2xl border backdrop-blur-2xl transition-all shadow-xl ${
                submissionResult?.isCorrect
                  ? 'bg-gradient-to-r from-cyber-green/20 via-emerald-950/30 to-surface-dark/90 border-cyber-green/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : submitted
                  ? 'bg-gradient-to-r from-cyber-red/20 via-red-950/30 to-surface-dark/90 border-cyber-red/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                  : 'bg-gradient-to-r from-amber-500/20 via-amber-950/30 to-surface-dark/90 border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-black shadow-md ${
                      submissionResult?.isCorrect
                        ? 'bg-gradient-to-tr from-cyber-green to-emerald-400 text-surface-dark'
                        : submitted
                        ? 'bg-gradient-to-tr from-cyber-red to-rose-400 text-white'
                        : 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-surface-dark'
                    }`}
                  >
                    {submissionResult?.isCorrect ? '✓' : submitted ? '✕' : '⏱️'}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono font-black tracking-widest text-gray-400 block">
                      YOUR ROUND #{currentQuestion ? currentQuestion.index + 1 : 1} SCORE
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-white">
                      {submissionResult?.isCorrect
                        ? `🎉 SPOT ON! +${submissionResult.totalMarks} TOTAL POINTS`
                        : submitted
                        ? '❌ INCORRECT (0 Points)'
                        : '⌛ TIME EXPIRED (0 Points)'}
                    </h3>
                  </div>
                </div>

                {/* Score breakdown pills */}
                {submissionResult?.isCorrect ? (
                  <div className="flex items-center gap-1.5 font-mono text-[10px] flex-shrink-0">
                    <span className="px-2 py-0.5 rounded bg-cyber-green/20 text-cyber-green border border-cyber-green/40 font-bold">
                      Base: +{submissionResult.baseMarks || 10}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 font-bold">
                      Speed: +{submissionResult.speedBonus || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-dark text-gray-300 border border-white/10 font-bold">
                      ⏱️ {((submissionResult.responseTimeMs || 0) / 1000).toFixed(2)}s
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-gray-400">
                    +0 Base • +0 Bonus
                  </span>
                )}
              </div>

              {/* Solution / Explanation box (1-line concise) */}
              {questionFeedback?.explanation && (
                <div className="mt-2 p-2 rounded-lg bg-surface-dark/80 border border-white/10 text-[11px] text-gray-300 font-sans truncate">
                  <strong className="text-cyber-cyan font-mono">💡 Explanation: </strong>
                  {questionFeedback.explanation}
                </div>
              )}
            </div>

            {/* 4. BOTTOM COUNTDOWN TRANSITION HUD / PAUSED STATUS */}
            <div
              className={`p-2.5 sm:p-3 rounded-2xl border text-center relative overflow-hidden transition-all ${
                isPaused
                  ? 'bg-gradient-to-r from-amber-500/15 via-[#030917] to-amber-500/15 border-amber-400/50'
                  : 'bg-[#030917] border-cyber-cyan/40 shadow-[0_0_20px_rgba(0,217,255,0.2)]'
              }`}
            >
              {isPaused ? (
                <div className="flex items-center justify-center gap-2 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-300">
                    SESSION PAUSED BY HOST • REVIEW STANDINGS
                  </span>
                </div>
              ) : reviewRemaining > 5 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-cyber-cyan font-mono font-bold text-[11px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-ping" />
                    <span>Reviewing Standings & Speed Bonuses</span>
                  </div>
                  <div className="w-full bg-surface-dark rounded-full h-1 overflow-hidden border border-white/10 max-w-sm mx-auto">
                    <div
                      className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-violet transition-all duration-1000"
                      style={{ width: `${((10 - reviewRemaining) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-cyber-amber flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyber-amber animate-bounce" />
                    {questionFeedback?.isLastQuestion
                      ? 'FINAL PODIUM REVEAL IN'
                      : `NEXT QUESTION #${currentQuestion ? currentQuestion.index + 2 : 2} IN`}
                  </span>

                  {/* Pulsating 5-to-1 Digital Number */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyber-cyan via-blue-500 to-cyber-violet flex items-center justify-center text-surface-dark font-mono font-black text-lg shadow-[0_0_15px_rgba(0,217,255,0.8)] animate-pulse">
                    {Math.max(1, reviewRemaining)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. SHOW LEADERBOARD VIEW */}
        {sessionStatus === 'SHOW_LEADERBOARD' && (
          <div className="p-6 sm:p-8 rounded-3xl glass-panel-glow space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet text-xs font-mono font-bold mb-2">
                LIVE STANDINGS
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Arena Leaderboard
              </h2>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {leaderboard.map((item: any, idx: number) => {
                const isMe = item.id === participant?.id;
                return (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      isMe
                        ? 'border-cyber-cyan bg-cyber-cyan/20 shadow-[0_0_20px_rgba(0,217,255,0.4)]'
                        : idx === 0
                        ? 'border-cyber-gold/50 bg-cyber-gold/10'
                        : 'border-white/10 bg-surface-dark/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center font-mono font-black text-xs text-gray-300">
                        #{item.rank || idx + 1}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {item.name} {isMe && <span className="text-cyber-cyan text-xs font-extrabold">(You)</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-gray-400 hidden sm:inline">{item.correctCount || 0} Correct</span>
                      <span className="text-cyber-cyan font-black text-base">{item.score} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. COMPLETED SCREEN */}
        {sessionStatus === 'COMPLETED' && (
          <div className="p-8 sm:p-12 rounded-3xl glass-panel-glow text-center backdrop-blur-2xl space-y-6">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.7)] animate-float">
              <Trophy className="w-12 h-12 text-surface-dark stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-cyber-cyan font-black font-mono">
                ARENA COMPETITION CONCLUDED
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white mt-1">
                Victory & Standings
              </h1>
              <p className="text-sm text-gray-300 mt-2">
                Thank you for competing in the {quizInfo?.title || 'Robotics & Arduino Challenge'}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="p-5 rounded-2xl bg-[#030917] border border-cyber-cyan/30">
                <span className="text-[10px] uppercase text-gray-400 font-bold font-mono">Final Score</span>
                <div className="text-3xl font-mono font-black text-cyber-cyan mt-1">
                  {participant?.totalScore || 0}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#030917] border border-cyber-violet/30">
                <span className="text-[10px] uppercase text-gray-400 font-bold font-mono">Final Rank</span>
                <div className="text-3xl font-mono font-black text-cyber-violet mt-1">
                  #{participant?.rank || (finalRankings.findIndex((p: any) => p.id === participant?.id) + 1) || 1}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link href={`/results/${sessionCode}`}>
                <CyberButton variant="cyan" size="md" icon={<BarChart2 className="w-4 h-4" />}>
                  Performance Analytics
                </CyberButton>
              </Link>
              <Link href={`/leaderboard/${sessionCode}`}>
                <CyberButton variant="outline" size="md" icon={<Award className="w-4 h-4" />}>
                  Public Podium
                </CyberButton>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-[11px] text-gray-500 font-mono z-10">
        ROBOQUEST • SESSION PIN {sessionCode}
      </footer>
    </div>
  );
}
