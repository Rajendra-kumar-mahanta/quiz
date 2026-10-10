const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Optimize SQLite for high concurrency (120+ concurrent participants)
if (process.env.DATABASE_URL?.includes('file:') || !process.env.DATABASE_URL) {
  prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;'))
    .then(() => prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;'))
    .then(() => prisma.$queryRawUnsafe('PRAGMA cache_size = -64000;'))
    .catch(() => {});
}

const sessionTimers = new Map();
const submissionDebounceTimers = new Map();
let ioInstance = null;

function clearSessionTimer(sessionCode) {
  if (sessionTimers.has(sessionCode)) {
    clearInterval(sessionTimers.get(sessionCode));
    sessionTimers.delete(sessionCode);
  }
}

function broadcastSubmissionUpdate(sessionCode, updateData) {
  if (submissionDebounceTimers.has(sessionCode)) return;
  const timer = setTimeout(() => {
    submissionDebounceTimers.delete(sessionCode);
    if (ioInstance) {
      ioInstance.to(`session:${sessionCode}`).emit('session:submission_update', updateData);
    }
  }, 150);
  submissionDebounceTimers.set(sessionCode, timer);
}

function sortParticipants(participants) {
  return [...participants].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.totalResponseTimeMs !== b.totalResponseTimeMs) return a.totalResponseTimeMs - b.totalResponseTimeMs;
    const timeA = new Date(a.joinedAt).getTime();
    const timeB = new Date(b.joinedAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });
}

function evaluateScore(question, selectedOptionIds, serverReceivedAt, questionStartedAt, questionDeadline, baseMarks = 10, maxBonus = 10) {
  const receivedMs = serverReceivedAt.getTime();
  const startMs = questionStartedAt.getTime();
  const deadlineMs = questionDeadline.getTime();
  const responseTimeMs = Math.max(0, receivedMs - startMs);

  const isLate = receivedMs > (deadlineMs + 500);
  if (isLate) {
    return {
      isCorrect: false,
      baseMarks: 0,
      speedBonus: 0,
      totalMarks: 0,
      remainingSeconds: 0,
      responseTimeMs,
      status: 'TIMEOUT'
    };
  }

  const remainingMs = Math.max(0, deadlineMs - receivedMs);
  const remainingSeconds = Math.min(question.duration || 30, Math.ceil(remainingMs / 1000));

  const correctOptionIds = (question.options || [])
    .filter(opt => opt.isCorrect)
    .map(opt => opt.id);

  let isCorrect = false;
  if (question.type === 'MCQ_MULTIPLE') {
    const selSet = new Set(selectedOptionIds);
    const corrSet = new Set(correctOptionIds);
    isCorrect = selSet.size === corrSet.size && [...selSet].every(id => corrSet.has(id));
  } else {
    if (selectedOptionIds.length === 1 && correctOptionIds.includes(selectedOptionIds[0])) {
      isCorrect = true;
    }
  }

  if (!isCorrect) {
    return {
      isCorrect: false,
      baseMarks: 0,
      speedBonus: 0,
      totalMarks: 0,
      remainingSeconds,
      responseTimeMs,
      status: 'SUBMITTED'
    };
  }

  const speedBonus = Math.min(maxBonus, Math.floor(remainingSeconds / 3));
  const totalMarks = baseMarks + speedBonus;

  return {
    isCorrect: true,
    baseMarks,
    speedBonus,
    totalMarks,
    remainingSeconds,
    responseTimeMs,
    status: 'SUBMITTED'
  };
}

async function launchNextQuestion(sessionCode, sessionId, questionIndex) {
  clearSessionTimer(sessionCode);
  try {
    const session = await prisma.quizSession.findFirst({
      where: { OR: [{ id: sessionId }, { sessionCode }] },
      include: {
        sessionQuestions: { orderBy: { questionOrder: 'asc' } },
        quiz: true
      }
    });

    if (!session || questionIndex >= session.sessionQuestions.length) return;

    const targetSQ = session.sessionQuestions[questionIndex];
    const questionData = JSON.parse(targetSQ.snapshotData);
    const duration = questionData.duration || session.quiz.defaultDuration || 30;

    const now = new Date();
    const deadline = new Date(now.getTime() + duration * 1000);

    await prisma.quizSession.update({
      where: { id: session.id },
      data: {
        status: 'ACTIVE_QUESTION',
        currentQuestionIndex: questionIndex,
        currentQuestionStartedAt: now,
        currentQuestionDeadline: deadline,
        isLive: true
      }
    });

    await prisma.sessionQuestion.update({
      where: { id: targetSQ.id },
      data: { startedAt: now, isClosed: false }
    });

    const cleanOptions = (questionData.options || []).map(opt => ({
      id: opt.id,
      text: opt.text
    }));

    if (ioInstance) {
      ioInstance.to(`session:${session.sessionCode}`).emit('session:question_started', {
        question: {
          id: questionData.id,
          index: questionIndex,
          totalQuestions: session.sessionQuestions.length,
          text: questionData.text,
          codeSnippet: questionData.codeSnippet,
          image: questionData.image,
          type: questionData.type,
          points: questionData.points,
          duration,
          category: questionData.category,
          difficulty: questionData.difficulty,
          options: cleanOptions,
          startedAt: now,
          deadline
        }
      });
    }

    startQuestionTimer(session.sessionCode, session.id, duration);
  } catch (err) {
    console.error('Error launching next question:', err);
  }
}

async function completeQuizSession(sessionCode, sessionId) {
  clearSessionTimer(sessionCode);
  try {
    const session = await prisma.quizSession.findFirst({
      where: { OR: [{ id: sessionId }, { sessionCode }] },
      include: { participants: true }
    });
    if (!session) return;

    const ranked = sortParticipants(session.participants);

    for (let i = 0; i < ranked.length; i++) {
      await prisma.participant.update({
        where: { id: ranked[i].id },
        data: { finalRank: i + 1 }
      });
    }

    await prisma.quizSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        isLive: false
      }
    });

    if (ioInstance) {
      ioInstance.to(`session:${session.sessionCode}`).emit('session:completed', {
        finalRankings: ranked.map((p, idx) => ({
          rank: idx + 1,
          id: p.id,
          name: p.name,
          department: p.department,
          institution: p.institution,
          score: p.totalScore,
          correctCount: p.correctCount,
          incorrectCount: p.incorrectCount,
          avgResponseTimeMs: p.averageResponseTimeMs
        }))
      });
    }
  } catch (err) {
    console.error('Error completing session:', err);
  }
}

const sessionPausedState = new Map();

function startReviewCountdown(sessionCode, sessionId, reviewSeconds = 8) {
  clearSessionTimer(sessionCode);
  let remaining = reviewSeconds;

  const interval = setInterval(async () => {
    // If paused while countdown is running, stop countdown immediately
    if (sessionPausedState.get(sessionCode)) {
      clearSessionTimer(sessionCode);
      if (ioInstance) {
        ioInstance.to(`session:${sessionCode}`).emit('session:paused', {
          isPaused: true,
          isPauseScheduled: false
        });
      }
      return;
    }

    remaining -= 1;
    if (ioInstance) {
      ioInstance.to(`session:${sessionCode}`).emit('session:review_tick', {
        remainingSeconds: Math.max(0, remaining),
        totalSeconds: reviewSeconds
      });
    }

    if (remaining <= 0) {
      clearSessionTimer(sessionCode);
      try {
        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
          include: { sessionQuestions: true }
        });

        if (!session) return;
        const nextIndex = session.currentQuestionIndex + 1;
        if (nextIndex < session.sessionQuestions.length) {
          await launchNextQuestion(sessionCode, sessionId, nextIndex);
        } else {
          await completeQuizSession(sessionCode, sessionId);
        }
      } catch (e) {
        console.error('Error in auto review advance:', e);
      }
    }
  }, 1000);

  sessionTimers.set(sessionCode, interval);
}

async function pauseSession(sessionCode, sessionId) {
  sessionPausedState.set(sessionCode, true);
  try {
    const session = await prisma.quizSession.findFirst({
      where: { OR: [{ id: sessionId }, { sessionCode }] }
    });
    if (!session) return { isPaused: true, isPauseScheduled: false };

    if (session.status === 'QUESTION_CLOSED' || session.status === 'SHOW_LEADERBOARD') {
      clearSessionTimer(sessionCode);
      if (ioInstance) {
        ioInstance.to(`session:${sessionCode}`).emit('session:paused', {
          isPaused: true,
          isPauseScheduled: false
        });
      }
      return { isPaused: true, isPauseScheduled: false };
    } else if (session.status === 'ACTIVE_QUESTION') {
      if (ioInstance) {
        ioInstance.to(`session:${sessionCode}`).emit('session:pause_scheduled', {
          isPauseScheduled: true,
          isPaused: false
        });
      }
      return { isPaused: false, isPauseScheduled: true };
    }
  } catch (err) {
    console.error('Error in pauseSession:', err);
  }
  return { isPaused: true, isPauseScheduled: false };
}

async function resumeSession(sessionCode, sessionId) {
  sessionPausedState.set(sessionCode, false);
  try {
    const session = await prisma.quizSession.findFirst({
      where: { OR: [{ id: sessionId }, { sessionCode }] }
    });
    if (!session) return { isPaused: false };

    if (ioInstance) {
      ioInstance.to(`session:${sessionCode}`).emit('session:resumed', {
        isPaused: false,
        isPauseScheduled: false
      });
    }

    if (session.status === 'QUESTION_CLOSED') {
      // Start 5-second countdown to next question
      startReviewCountdown(session.sessionCode, session.id, 5);
    }
  } catch (err) {
    console.error('Error in resumeSession:', err);
  }
  return { isPaused: false };
}

async function closeCurrentQuestion(sessionCode, sessionId) {
  clearSessionTimer(sessionCode);

  try {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionQuestions: { orderBy: { questionOrder: 'asc' } },
        participants: true,
        quiz: true
      }
    });

    if (!session || session.currentQuestionIndex < 0 || session.currentQuestionIndex >= session.sessionQuestions.length) {
      return;
    }

    const currentSQ = session.sessionQuestions[session.currentQuestionIndex];
    if (currentSQ.isClosed) return;

    const questionData = JSON.parse(currentSQ.snapshotData);

    const dbTransactions = [];

    dbTransactions.push(
      prisma.sessionQuestion.update({
        where: { id: currentSQ.id },
        data: { isClosed: true, endedAt: new Date() }
      })
    );

    dbTransactions.push(
      prisma.quizSession.update({
        where: { id: sessionId },
        data: { status: 'QUESTION_CLOSED' }
      })
    );

    const responses = await prisma.participantResponse.findMany({
      where: { sessionQuestionId: currentSQ.id }
    });

    const optionCounts = {};
    (questionData.options || []).forEach(opt => {
      optionCounts[opt.id] = 0;
    });

    const evaluatedResponses = [];
    const participantScoreUpdates = new Map();

    for (const res of responses) {
      try {
        const selected = JSON.parse(res.selectedOptionIds);
        selected.forEach(optId => {
          if (optionCounts[optId] !== undefined) {
            optionCounts[optId] += 1;
          }
        });

        const scoreResult = evaluateScore(
          questionData,
          selected,
          res.serverReceivedAt,
          session.currentQuestionStartedAt || res.serverReceivedAt,
          session.currentQuestionDeadline || res.serverReceivedAt,
          session.quiz.baseMarks || 10,
          session.quiz.maxBonus || 10
        );

        dbTransactions.push(
          prisma.participantResponse.update({
            where: { id: res.id },
            data: {
              isCorrect: scoreResult.isCorrect,
              baseMarks: scoreResult.baseMarks,
              speedBonus: scoreResult.speedBonus,
              totalMarks: scoreResult.totalMarks,
              responseTimeMs: scoreResult.responseTimeMs,
              status: scoreResult.status
            }
          })
        );

        evaluatedResponses.push({
          ...res,
          isCorrect: scoreResult.isCorrect,
          baseMarks: scoreResult.baseMarks,
          speedBonus: scoreResult.speedBonus,
          totalMarks: scoreResult.totalMarks,
          responseTimeMs: scoreResult.responseTimeMs
        });

        participantScoreUpdates.set(res.participantId, scoreResult);

        const currentP = session.participants.find(p => p.id === res.participantId);
        if (currentP) {
          const totalAttempts = currentP.correctCount + currentP.incorrectCount + 1;
          const newTotalTime = currentP.totalResponseTimeMs + scoreResult.responseTimeMs;
          const newAvgTime = Math.round(newTotalTime / totalAttempts);

          dbTransactions.push(
            prisma.participant.update({
              where: { id: res.participantId },
              data: {
                totalScore: { increment: scoreResult.totalMarks },
                totalBonus: { increment: scoreResult.speedBonus },
                correctCount: scoreResult.isCorrect ? { increment: 1 } : undefined,
                incorrectCount: (!scoreResult.isCorrect && scoreResult.status !== 'TIMEOUT') ? { increment: 1 } : undefined,
                totalResponseTimeMs: newTotalTime,
                averageResponseTimeMs: newAvgTime
              }
            })
          );
        }
      } catch (e) {
        console.error('Error evaluating response:', e);
      }
    }

    // Handle unattended participants (who did not submit any response for this question)
    const attendedParticipantIds = new Set(responses.map(r => r.participantId));
    for (const p of session.participants) {
      if (!attendedParticipantIds.has(p.id)) {
        dbTransactions.push(
          prisma.participant.update({
            where: { id: p.id },
            data: {
              unansweredCount: { increment: 1 }
            }
          })
        );
      }
    }

    // Execute ALL database updates in a single ultra-fast atomic batch transaction
    if (dbTransactions.length > 0) {
      await prisma.$transaction(dbTransactions);
    }

    const correctOptionIds = (questionData.options || [])
      .filter(opt => opt.isCorrect)
      .map(opt => opt.id);

    // Fetch freshly updated participants with newly calculated scores
    const updatedParticipants = await prisma.participant.findMany({
      where: { sessionId }
    });
    const ranked = sortParticipants(updatedParticipants);

    // 1. Overall Leader (Current Top #1)
    const overallLeader = ranked.length > 0 ? {
      rank: 1,
      id: ranked[0].id,
      name: ranked[0].name,
      department: ranked[0].department || 'General',
      institution: ranked[0].institution || '',
      score: ranked[0].totalScore,
      correctCount: ranked[0].correctCount,
      avatar: ranked[0].name.charAt(0).toUpperCase()
    } : null;

    // 2. Top 3 Fastest Correct Performers for THIS Particular Question
    const topQuestionPerformers = evaluatedResponses
      .filter(r => r.isCorrect)
      .sort((a, b) => {
        if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks;
        return a.responseTimeMs - b.responseTimeMs;
      })
      .slice(0, 3)
      .map((r, idx) => {
        const p = updatedParticipants.find(part => part.id === r.participantId);
        return {
          rank: idx + 1,
          participantId: r.participantId,
          name: p ? p.name : 'Gladiator',
          department: p ? p.department : 'General',
          totalMarks: r.totalMarks,
          baseMarks: r.baseMarks,
          speedBonus: r.speedBonus,
          responseTimeMs: r.responseTimeMs,
          avatar: p ? p.name.charAt(0).toUpperCase() : 'P'
        };
      });

    const isLast = session.currentQuestionIndex >= session.sessionQuestions.length - 1;
    const attendedCount = responses.length;
    const unattendedCount = Math.max(0, updatedParticipants.length - attendedCount);

    const userResultsMap = {};
    for (const [pId, scoreRes] of participantScoreUpdates.entries()) {
      userResultsMap[pId] = scoreRes;
    }

    if (ioInstance) {
      ioInstance.to(`session:${sessionCode}`).emit('session:question_closed', {
        questionId: currentSQ.questionId,
        questionIndex: session.currentQuestionIndex,
        correctOptionIds,
        explanation: questionData.explanation || null,
        optionDistribution: optionCounts,
        attendedCount,
        unattendedCount,
        totalResponses: attendedCount,
        totalParticipants: updatedParticipants.length,
        overallLeader,
        topQuestionPerformers,
        isLastQuestion: isLast,
        reviewSeconds: 10,
        userResultsMap,
        leaderboard: ranked.map((p, idx) => ({
          rank: idx + 1,
          id: p.id,
          name: p.name,
          department: p.department,
          institution: p.institution,
          score: p.totalScore,
          bonus: p.totalBonus,
          correctCount: p.correctCount,
          incorrectCount: p.incorrectCount,
          unansweredCount: p.unansweredCount,
          avgResponseTimeMs: p.averageResponseTimeMs,
          avatar: p.name.charAt(0).toUpperCase()
        }))
      });
    }

    // If session is paused (or was scheduled to pause at question timing end), do not start auto review countdown
    if (sessionPausedState.get(sessionCode)) {
      if (ioInstance) {
        ioInstance.to(`session:${sessionCode}`).emit('session:paused', {
          isPaused: true,
          isPauseScheduled: false,
          questionIndex: session.currentQuestionIndex
        });
      }
    } else {
      // Automatically trigger 10-second review countdown before auto-launching next question / conclusion
      startReviewCountdown(session.sessionCode, session.id, 10);
    }

  } catch (err) {
    console.error('Error closing question:', err);
  }
}

function startQuestionTimer(sessionCode, sessionId, durationSec) {
  clearSessionTimer(sessionCode);
  let remaining = durationSec;

  const interval = setInterval(async () => {
    remaining -= 1;
    if (ioInstance) {
      ioInstance.to(`session:${sessionCode}`).emit('session:timer_tick', {
        remainingSeconds: Math.max(0, remaining),
        totalSeconds: durationSec
      });
    }

    if (remaining <= 0) {
      clearSessionTimer(sessionCode);
      await closeCurrentQuestion(sessionCode, sessionId);
    }
  }, 1000);

  sessionTimers.set(sessionCode, interval);
}

function setupSocketServer(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // 1. Join Room
    socket.on('session:join', async (data) => {
      const { sessionCode, role, participantToken } = data || {};
      if (!sessionCode) return;

      const room = `session:${sessionCode}`;
      socket.join(room);

      try {
        const session = await prisma.quizSession.findFirst({
          where: { OR: [{ sessionCode }, { id: sessionCode }] },
          include: {
            quiz: true,
            sessionQuestions: { orderBy: { questionOrder: 'asc' } },
            participants: { orderBy: { joinedAt: 'asc' } }
          }
        });

        if (!session) {
          socket.emit('session:error', { message: 'Session not found' });
          return;
        }

        const authoritativeRoom = `session:${session.sessionCode}`;
        socket.join(authoritativeRoom);

        let currentParticipant = null;
        if (role === 'participant' && participantToken) {
          currentParticipant = await prisma.participant.findUnique({
            where: { sessionToken: participantToken }
          });
          if (currentParticipant) {
            await prisma.participant.update({
              where: { id: currentParticipant.id },
              data: { isConnected: true, socketId: socket.id, lastSeenAt: new Date() }
            });
            socket.join(`participant:${currentParticipant.id}`);
          }
        }

        let activeQuestionData = null;
        let userSubmission = null;

        if (session.currentQuestionIndex >= 0 && session.currentQuestionIndex < session.sessionQuestions.length) {
          const currentSQ = session.sessionQuestions[session.currentQuestionIndex];
          const rawQ = JSON.parse(currentSQ.snapshotData);

          const options = (rawQ.options || []).map(opt => ({
            id: opt.id,
            text: opt.text,
            isCorrect: (session.status === 'QUESTION_CLOSED' || session.status === 'SHOW_LEADERBOARD' || session.status === 'COMPLETED' || role === 'admin') ? opt.isCorrect : undefined
          }));

          activeQuestionData = {
            id: rawQ.id,
            index: session.currentQuestionIndex,
            totalQuestions: session.sessionQuestions.length,
            text: rawQ.text,
            codeSnippet: rawQ.codeSnippet,
            image: rawQ.image,
            type: rawQ.type,
            points: rawQ.points,
            duration: rawQ.duration,
            category: rawQ.category,
            difficulty: rawQ.difficulty,
            options,
            isClosed: currentSQ.isClosed,
            startedAt: currentSQ.startedAt,
            deadline: session.currentQuestionDeadline,
            explanation: (session.status === 'QUESTION_CLOSED' || session.status === 'SHOW_LEADERBOARD' || session.status === 'COMPLETED' || role === 'admin') ? rawQ.explanation : undefined
          };

          if (currentParticipant) {
            const existingRes = await prisma.participantResponse.findUnique({
              where: {
                sessionId_participantId_sessionQuestionId: {
                  sessionId: session.id,
                  participantId: currentParticipant.id,
                  sessionQuestionId: currentSQ.id
                }
              }
            });
            if (existingRes) {
              userSubmission = {
                selectedOptionIds: JSON.parse(existingRes.selectedOptionIds),
                isCorrect: existingRes.isCorrect,
                totalMarks: existingRes.totalMarks,
                baseMarks: existingRes.baseMarks,
                speedBonus: existingRes.speedBonus,
                responseTimeMs: existingRes.responseTimeMs
              };
            }
          }
        }

        let remainingSeconds = 0;
        if (session.currentQuestionDeadline && session.status === 'ACTIVE_QUESTION') {
          const remMs = session.currentQuestionDeadline.getTime() - Date.now();
          remainingSeconds = Math.max(0, Math.ceil(remMs / 1000));
        }

        const rankedParticipants = sortParticipants(session.participants);

        socket.emit('session:state', {
          session: {
            id: session.id,
            code: session.sessionCode,
            title: session.title,
            status: session.status,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.sessionQuestions.length,
            isLive: session.isLive,
            remainingSeconds,
            participantCount: session.participants.length,
          },
          quiz: {
            title: session.quiz.title,
            instructions: session.quiz.instructions,
            defaultDuration: session.quiz.defaultDuration
          },
          participant: currentParticipant ? {
            id: currentParticipant.id,
            name: currentParticipant.name,
            totalScore: currentParticipant.totalScore,
            correctCount: currentParticipant.correctCount,
            rank: rankedParticipants.findIndex(p => p.id === currentParticipant?.id) + 1
          } : null,
          activeQuestion: activeQuestionData,
          userSubmission,
          leaderboard: rankedParticipants.slice(0, 10).map((p, idx) => ({
            rank: idx + 1,
            id: p.id,
            name: p.name,
            score: p.totalScore,
            correctCount: p.correctCount,
            avatar: p.name.charAt(0).toUpperCase()
          }))
        });

        io.to(`session:${sessionCode}`).emit('session:participant_count', {
          count: session.participants.length,
          participants: session.participants.map(p => ({ id: p.id, name: p.name, department: p.department }))
        });

      } catch (err) {
        console.error('Error in socket session:join:', err);
      }
    });

    // 2. Submit Answer (Locks answer in server, score calculated only after timing completes)
    socket.on('participant:submit_answer', async (data) => {
      const serverReceivedAt = new Date();
      const { sessionCode, participantToken, selectedOptionIds } = data || {};

      try {
        const session = await prisma.quizSession.findFirst({
          where: { OR: [{ sessionCode }, { id: sessionCode }] },
          include: {
            sessionQuestions: { orderBy: { questionOrder: 'asc' } },
            participants: true,
            quiz: true
          }
        });

        if (!session || session.status !== 'ACTIVE_QUESTION') {
          socket.emit('submission:error', { message: 'Question is not active.' });
          return;
        }

        const participant = await prisma.participant.findUnique({
          where: { sessionToken: participantToken }
        });

        if (!participant || participant.sessionId !== session.id) {
          socket.emit('submission:error', { message: 'Invalid participant.' });
          return;
        }

        const currentSQ = session.sessionQuestions[session.currentQuestionIndex];
        if (!currentSQ || currentSQ.isClosed || !session.currentQuestionStartedAt || !session.currentQuestionDeadline) {
          socket.emit('submission:error', { message: 'Question closed or invalid.' });
          return;
        }

        const existing = await prisma.participantResponse.findUnique({
          where: {
            sessionId_participantId_sessionQuestionId: {
              sessionId: session.id,
              participantId: participant.id,
              sessionQuestionId: currentSQ.id
            }
          }
        });

        if (existing) {
          socket.emit('submission:already_submitted', {
            message: 'Answer already received and locked.',
            response: existing
          });
          return;
        }

        const responseTimeMs = Math.max(0, serverReceivedAt.getTime() - session.currentQuestionStartedAt.getTime());

        // Create response in LOCKED status without committing score yet
        await prisma.participantResponse.create({
          data: {
            sessionId: session.id,
            participantId: participant.id,
            questionId: currentSQ.questionId,
            sessionQuestionId: currentSQ.id,
            selectedOptionIds: JSON.stringify(selectedOptionIds || []),
            isCorrect: false,
            baseMarks: 0,
            speedBonus: 0,
            totalMarks: 0,
            responseTimeMs,
            serverReceivedAt,
            status: 'LOCKED'
          }
        });

        // Notify participant that submission is securely locked
        socket.emit('submission:success', {
          locked: true,
          responseTimeMs,
          selectedOptionIds: selectedOptionIds || [],
          message: 'Answer locked in server. Scoring will calculate upon timer expiration.'
        });

        const totalAttended = await prisma.participantResponse.count({
          where: { sessionQuestionId: currentSQ.id }
        });

        const totalParticipantsCount = session.participants.length;
        const unattendedCount = Math.max(0, totalParticipantsCount - totalAttended);

        broadcastSubmissionUpdate(session.sessionCode, {
          questionId: currentSQ.questionId,
          attendedCount: totalAttended,
          unattendedCount,
          totalParticipants: totalParticipantsCount,
          participantId: participant.id,
          participantName: participant.name,
          responseTimeMs
        });

      } catch (err) {
        console.error('Error submitting answer:', err);
        socket.emit('submission:error', { message: 'Failed to record submission' });
      }
    });

    // 3. Admin: Next Question
    socket.on('admin:next_question', async (data) => {
      const { sessionCode, questionIndex } = data || {};
      try {
        const session = await prisma.quizSession.findFirst({
          where: { OR: [{ sessionCode }, { id: sessionCode }] },
          include: {
            sessionQuestions: { orderBy: { questionOrder: 'asc' } },
            quiz: true
          }
        });

        if (!session || questionIndex >= session.sessionQuestions.length) return;

        const targetSQ = session.sessionQuestions[questionIndex];
        const questionData = JSON.parse(targetSQ.snapshotData);
        const duration = questionData.duration || session.quiz.defaultDuration || 30;

        const now = new Date();
        const deadline = new Date(now.getTime() + duration * 1000);

        await prisma.quizSession.update({
          where: { id: session.id },
          data: {
            status: 'ACTIVE_QUESTION',
            currentQuestionIndex: questionIndex,
            currentQuestionStartedAt: now,
            currentQuestionDeadline: deadline,
            isLive: true
          }
        });

        await prisma.sessionQuestion.update({
          where: { id: targetSQ.id },
          data: { startedAt: now, isClosed: false }
        });

        const cleanOptions = (questionData.options || []).map(opt => ({
          id: opt.id,
          text: opt.text
        }));

        io.to(`session:${session.sessionCode}`).emit('session:question_started', {
          question: {
            id: questionData.id,
            index: questionIndex,
            totalQuestions: session.sessionQuestions.length,
            text: questionData.text,
            codeSnippet: questionData.codeSnippet,
            image: questionData.image,
            type: questionData.type,
            points: questionData.points,
            duration,
            category: questionData.category,
            difficulty: questionData.difficulty,
            options: cleanOptions,
            startedAt: now,
            deadline
          }
        });

        startQuestionTimer(session.sessionCode, session.id, duration);

      } catch (err) {
        console.error('Error in admin:next_question:', err);
      }
    });

    // 4. Admin: Close Question Early
    socket.on('admin:close_question', async (data) => {
      const { sessionCode } = data || {};
      const session = await prisma.quizSession.findFirst({
        where: { OR: [{ sessionCode }, { id: sessionCode }] }
      });
      if (session) {
        await closeCurrentQuestion(session.sessionCode, session.id);
      }
    });

    // 5. Admin: Show Leaderboard
    socket.on('admin:show_leaderboard', async (data) => {
      const { sessionCode } = data || {};
      try {
        const session = await prisma.quizSession.findFirst({
          where: { OR: [{ sessionCode }, { id: sessionCode }] },
          include: { participants: true }
        });
        if (!session) return;

        await prisma.quizSession.update({
          where: { id: session.id },
          data: { status: 'SHOW_LEADERBOARD' }
        });

        const ranked = sortParticipants(session.participants);

        io.to(`session:${session.sessionCode}`).emit('session:leaderboard', {
          leaderboard: ranked.map((p, idx) => ({
            rank: idx + 1,
            id: p.id,
            name: p.name,
            department: p.department,
            institution: p.institution,
            score: p.totalScore,
            bonus: p.totalBonus,
            correctCount: p.correctCount,
            incorrectCount: p.incorrectCount,
            avgResponseTimeMs: p.averageResponseTimeMs,
            avatar: p.name.charAt(0).toUpperCase()
          }))
        });
      } catch (err) {
        console.error('Error in admin:show_leaderboard:', err);
      }
    });

    // 6. Admin: Complete Session
    socket.on('admin:complete_session', async (data) => {
      const { sessionCode } = data || {};
      try {
        const session = await prisma.quizSession.findFirst({
          where: { OR: [{ sessionCode }, { id: sessionCode }] },
          include: { participants: true }
        });
        if (!session) return;

        clearSessionTimer(session.sessionCode);

        const ranked = sortParticipants(session.participants);

        for (let i = 0; i < ranked.length; i++) {
          await prisma.participant.update({
            where: { id: ranked[i].id },
            data: { finalRank: i + 1 }
          });
        }

        await prisma.quizSession.update({
          where: { id: session.id },
          data: {
            status: 'COMPLETED',
            endedAt: new Date(),
            isLive: false
          }
        });

        io.to(`session:${session.sessionCode}`).emit('session:completed', {
          finalRankings: ranked.map((p, idx) => ({
            rank: idx + 1,
            id: p.id,
            name: p.name,
            department: p.department,
            institution: p.institution,
            score: p.totalScore,
            correctCount: p.correctCount,
            incorrectCount: p.incorrectCount,
            avgResponseTimeMs: p.averageResponseTimeMs
          }))
        });
      } catch (err) {
        console.error('Error in admin:complete_session:', err);
      }
    });

    // 7. Admin: Pause Session (Pauses after question timing ends, before countdown starts)
    socket.on('admin:pause_session', async (data) => {
      const { sessionCode } = data || {};
      if (sessionCode) {
        const session = await prisma.quizSession.findFirst({
          where: { OR: [{ sessionCode }, { id: sessionCode }] }
        });
        if (session) {
          await pauseSession(session.sessionCode, session.id);
        }
      }
    });

    // 8. Admin: Resume Session (Resumes countdown to next question)
    socket.on('admin:resume_session', async (data) => {
      const { sessionCode } = data || {};
      if (sessionCode) {
        const session = await prisma.quizSession.findFirst({
          where: { OR: [{ sessionCode }, { id: sessionCode }] }
        });
        if (session) {
          await resumeSession(session.sessionCode, session.id);
        }
      }
    });
  });

  global.quizEngine = {
    startQuestionTimer,
    closeCurrentQuestion,
    clearSessionTimer,
    launchNextQuestion,
    completeQuizSession,
    startReviewCountdown,
    pauseSession,
    resumeSession,
    sessionPausedState
  };
}

module.exports = {
  setupSocketServer,
  startQuestionTimer,
  closeCurrentQuestion,
  clearSessionTimer,
  launchNextQuestion,
  completeQuizSession,
  startReviewCountdown,
  pauseSession,
  resumeSession,
  sessionPausedState
};
