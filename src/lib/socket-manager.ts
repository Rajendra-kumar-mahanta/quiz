import { Server as SocketIOServer, Socket } from 'socket.io';
import prisma from './prisma';
import { evaluateSubmission, sortParticipants } from './scoring';

let ioInstance: SocketIOServer | null = null;
const sessionTimers: Map<string, NodeJS.Timeout> = new Map();

export function setSocketIO(io: SocketIOServer) {
  ioInstance = io;
  setupSocketListeners(io);
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

function clearSessionTimer(sessionCode: string) {
  if (sessionTimers.has(sessionCode)) {
    clearInterval(sessionTimers.get(sessionCode)!);
    sessionTimers.delete(sessionCode);
  }
}

async function startQuestionTimer(sessionCode: string, sessionId: string, durationSec: number) {
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

export async function closeCurrentQuestion(sessionCode: string, sessionId: string) {
  clearSessionTimer(sessionCode);

  try {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionQuestions: {
          orderBy: { questionOrder: 'asc' }
        },
        participants: true,
        quiz: true
      }
    });

    if (!session || session.currentQuestionIndex < 0 || session.currentQuestionIndex >= session.sessionQuestions.length) {
      return;
    }

    const currentSQ = session.sessionQuestions[session.currentQuestionIndex];
    if (currentSQ.isClosed) return;

    // Parse snapshot data
    const questionData = JSON.parse(currentSQ.snapshotData);

    // Update session and session question
    await prisma.sessionQuestion.update({
      where: { id: currentSQ.id },
      data: { isClosed: true, endedAt: new Date() }
    });

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { status: 'QUESTION_CLOSED' }
    });

    // Fetch all responses for this question
    const responses = await prisma.participantResponse.findMany({
      where: { sessionQuestionId: currentSQ.id }
    });

    // Option distribution calculation
    const optionCounts: Record<string, number> = {};
    questionData.options.forEach((opt: any) => {
      optionCounts[opt.id] = 0;
    });

    responses.forEach((res) => {
      try {
        const selected = JSON.parse(res.selectedOptionIds);
        selected.forEach((optId: string) => {
          if (optionCounts[optId] !== undefined) {
            optionCounts[optId] += 1;
          }
        });
      } catch (e) {}
    });

    // Find correct options and explanation
    const correctOptionIds = questionData.options
      .filter((opt: any) => opt.isCorrect)
      .map((opt: any) => opt.id);

    // Get current leaderboard
    const participants = await prisma.participant.findMany({
      where: { sessionId }
    });
    const ranked = sortParticipants(participants);

    if (ioInstance) {
      ioInstance.to(`session:${sessionCode}`).emit('session:question_closed', {
        questionId: currentSQ.questionId,
        questionIndex: session.currentQuestionIndex,
        correctOptionIds,
        explanation: questionData.explanation || null,
        optionDistribution: optionCounts,
        totalResponses: responses.length,
        totalParticipants: participants.length,
        leaderboard: ranked.slice(0, 10).map((p, idx) => ({
          rank: idx + 1,
          id: p.id,
          name: p.name,
          score: p.totalScore,
          correctCount: p.correctCount,
          avatar: p.name.charAt(0).toUpperCase()
        }))
      });
    }
  } catch (err) {
    console.error('Error closing question:', err);
  }
}

export function setupSocketListeners(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    // 1. Join Room Handler
    socket.on('session:join', async (data: { sessionCode: string; role: 'admin' | 'participant' | 'leaderboard'; participantToken?: string }) => {
      const { sessionCode, role, participantToken } = data;
      const room = `session:${sessionCode}`;
      socket.join(room);

      try {
        const session = await prisma.quizSession.findUnique({
          where: { sessionCode },
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

        // Send current session state snapshot to joining client
        let activeQuestionData = null;
        let userSubmission = null;

        if (session.currentQuestionIndex >= 0 && session.currentQuestionIndex < session.sessionQuestions.length) {
          const currentSQ = session.sessionQuestions[session.currentQuestionIndex];
          const rawQ = JSON.parse(currentSQ.snapshotData);

          // If question is still active, hide isCorrect unless closed or admin
          const options = rawQ.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            isCorrect: (session.status === 'QUESTION_CLOSED' || role === 'admin') ? opt.isCorrect : undefined
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
            explanation: (session.status === 'QUESTION_CLOSED' || role === 'admin') ? rawQ.explanation : undefined
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

        // Calculate remaining seconds if active
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

        // Broadcast participant count update
        io.to(`session:${sessionCode}`).emit('session:participant_count', {
          count: session.participants.length,
          participants: session.participants.map(p => ({ id: p.id, name: p.name, department: p.department }))
        });

      } catch (err) {
        console.error('Error in session:join socket event:', err);
      }
    });

    // 2. Submit Answer Handler
    socket.on('participant:submit_answer', async (data: {
      sessionCode: string;
      participantToken: string;
      selectedOptionIds: string[];
      clientTimestamp?: number;
    }) => {
      const serverReceivedAt = new Date();
      const { sessionCode, participantToken, selectedOptionIds } = data;

      try {
        const session = await prisma.quizSession.findUnique({
          where: { sessionCode },
          include: {
            sessionQuestions: { orderBy: { questionOrder: 'asc' } },
            quiz: true
          }
        });

        if (!session || session.status !== 'ACTIVE_QUESTION') {
          socket.emit('submission:error', { message: 'Question is not currently active.' });
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

        // Check for existing submission to guarantee idempotency
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
            message: 'Answer already received for this question.',
            response: existing
          });
          return;
        }

        // Evaluate score authoritatively
        const questionData = JSON.parse(currentSQ.snapshotData);
        const scoreResult = evaluateSubmission(
          questionData,
          selectedOptionIds,
          serverReceivedAt,
          session.currentQuestionStartedAt,
          session.currentQuestionDeadline,
          session.quiz.baseMarks,
          session.quiz.maxBonus,
          session.quiz.negativeMarking,
          session.quiz.negativeMarks
        );

        // Save response in database
        const response = await prisma.participantResponse.create({
          data: {
            sessionId: session.id,
            participantId: participant.id,
            questionId: currentSQ.questionId,
            sessionQuestionId: currentSQ.id,
            selectedOptionIds: JSON.stringify(selectedOptionIds),
            isCorrect: scoreResult.isCorrect,
            baseMarks: scoreResult.baseMarks,
            speedBonus: scoreResult.speedBonus,
            totalMarks: scoreResult.totalMarks,
            responseTimeMs: scoreResult.responseTimeMs,
            serverReceivedAt,
            status: scoreResult.status
          }
        });

        // Update participant cumulative statistics
        const updatedParticipant = await prisma.participant.update({
          where: { id: participant.id },
          data: {
            totalScore: { increment: scoreResult.totalMarks },
            totalBonus: { increment: scoreResult.speedBonus },
            correctCount: scoreResult.isCorrect ? { increment: 1 } : undefined,
            incorrectCount: (!scoreResult.isCorrect && scoreResult.status !== 'TIMEOUT') ? { increment: 1 } : undefined,
            totalResponseTimeMs: { increment: scoreResult.responseTimeMs },
            averageResponseTimeMs: Math.round((participant.totalResponseTimeMs + scoreResult.responseTimeMs) / (participant.correctCount + participant.incorrectCount + 1))
          }
        });

        // Send confirmation back to participant
        socket.emit('submission:success', {
          scoreResult: {
            isCorrect: scoreResult.isCorrect,
            totalMarks: scoreResult.totalMarks,
            baseMarks: scoreResult.baseMarks,
            speedBonus: scoreResult.speedBonus,
            remainingSeconds: scoreResult.remainingSeconds,
            responseTimeMs: scoreResult.responseTimeMs,
            newTotalScore: updatedParticipant.totalScore
          }
        });

        // Notify admin about submission metrics in real-time
        const totalResponsesCount = await prisma.participantResponse.count({
          where: { sessionQuestionId: currentSQ.id }
        });

        io.to(`session:${sessionCode}`).emit('admin:submission_update', {
          questionId: currentSQ.questionId,
          totalResponses: totalResponsesCount,
          participantId: participant.id,
          participantName: participant.name,
          responseTimeMs: scoreResult.responseTimeMs
        });

      } catch (err) {
        console.error('Error processing submission:', err);
        socket.emit('submission:error', { message: 'Internal server error processing response.' });
      }
    });

    // 3. Admin: Start Question / Next Question
    socket.on('admin:next_question', async (data: { sessionCode: string; questionIndex: number }) => {
      const { sessionCode, questionIndex } = data;
      try {
        const session = await prisma.quizSession.findUnique({
          where: { sessionCode },
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

        // Update database
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
          data: {
            startedAt: now,
            isClosed: false
          }
        });

        // Strip correct answer flags for participant broadcast
        const cleanOptions = questionData.options.map((opt: any) => ({
          id: opt.id,
          text: opt.text
        }));

        // Broadcast active question to all participants
        io.to(`session:${sessionCode}`).emit('session:question_started', {
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

        // Start server timer loop
        startQuestionTimer(sessionCode, session.id, duration);

      } catch (err) {
        console.error('Error starting next question:', err);
      }
    });

    // 4. Admin: Close Question Early
    socket.on('admin:close_question', async (data: { sessionCode: string }) => {
      const { sessionCode } = data;
      const session = await prisma.quizSession.findUnique({
        where: { sessionCode }
      });
      if (session) {
        await closeCurrentQuestion(sessionCode, session.id);
      }
    });

    // 5. Admin: Show Leaderboard
    socket.on('admin:show_leaderboard', async (data: { sessionCode: string }) => {
      const { sessionCode } = data;
      try {
        const session = await prisma.quizSession.findUnique({
          where: { sessionCode },
          include: { participants: true }
        });
        if (!session) return;

        await prisma.quizSession.update({
          where: { id: session.id },
          data: { status: 'SHOW_LEADERBOARD' }
        });

        const ranked = sortParticipants(session.participants);

        io.to(`session:${sessionCode}`).emit('session:leaderboard', {
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
        console.error('Error showing leaderboard:', err);
      }
    });

    // 6. Admin: Complete Quiz Session
    socket.on('admin:complete_session', async (data: { sessionCode: string }) => {
      const { sessionCode } = data;
      try {
        clearSessionTimer(sessionCode);
        const session = await prisma.quizSession.findUnique({
          where: { sessionCode },
          include: { participants: true }
        });
        if (!session) return;

        const ranked = sortParticipants(session.participants);

        // Update final ranks in DB
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

        io.to(`session:${sessionCode}`).emit('session:completed', {
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
        console.error('Error completing session:', err);
      }
    });

    socket.on('disconnect', () => {
      // Disconnect handling
    });
  });
}
