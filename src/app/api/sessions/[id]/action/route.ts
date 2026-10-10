import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { sortParticipants } from '@/lib/scoring';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, questionIndex } = body;

    const session = await prisma.quizSession.findFirst({
      where: { OR: [{ id }, { sessionCode: id }] },
      include: {
        sessionQuestions: { orderBy: { questionOrder: 'asc' } },
        quiz: true,
        participants: true
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const io = (global as any).io;

    switch (action) {
      case 'START_SESSION':
      case 'START_QUIZ': {
        // Start from question 0
        const firstSQ = session.sessionQuestions[0];
        if (!firstSQ) {
          return NextResponse.json({ error: 'Session has no questions' }, { status: 400 });
        }

        const qData = JSON.parse(firstSQ.snapshotData);
        const duration = qData.duration || session.quiz.defaultDuration || 30;
        const now = new Date();
        const deadline = new Date(now.getTime() + duration * 1000);

        await prisma.quizSession.update({
          where: { id: session.id },
          data: {
            status: 'ACTIVE_QUESTION',
            currentQuestionIndex: 0,
            currentQuestionStartedAt: now,
            currentQuestionDeadline: deadline,
            isLive: true,
            startedAt: session.startedAt || now
          }
        });

        await prisma.sessionQuestion.update({
          where: { id: firstSQ.id },
          data: { startedAt: now, isClosed: false }
        });

        if (io) {
          const cleanOptions = (qData.options || []).map((o: any) => ({ id: o.id, text: o.text }));
          io.to(`session:${session.sessionCode}`).emit('session:question_started', {
            question: {
              id: qData.id,
              index: 0,
              totalQuestions: session.sessionQuestions.length,
              text: qData.text,
              codeSnippet: qData.codeSnippet,
              image: qData.image,
              type: qData.type,
              points: qData.points,
              duration,
              category: qData.category,
              difficulty: qData.difficulty,
              options: cleanOptions,
              startedAt: now,
              deadline
            }
          });
        }

        const quizEngine = (global as any).quizEngine;
        if (quizEngine) {
          quizEngine.startQuestionTimer(session.sessionCode, session.id, duration);
        }

        return NextResponse.json({ success: true, message: 'Session started with Question 1' });
      }

      case 'NEXT_QUESTION': {
        const nextIdx = questionIndex !== undefined ? Number(questionIndex) : session.currentQuestionIndex + 1;
        if (nextIdx >= session.sessionQuestions.length) {
          return NextResponse.json({ error: 'No more questions in this quiz' }, { status: 400 });
        }

        const targetSQ = session.sessionQuestions[nextIdx];
        const qData = JSON.parse(targetSQ.snapshotData);
        const duration = qData.duration || session.quiz.defaultDuration || 30;
        const now = new Date();
        const deadline = new Date(now.getTime() + duration * 1000);

        await prisma.quizSession.update({
          where: { id: session.id },
          data: {
            status: 'ACTIVE_QUESTION',
            currentQuestionIndex: nextIdx,
            currentQuestionStartedAt: now,
            currentQuestionDeadline: deadline,
            isLive: true
          }
        });

        await prisma.sessionQuestion.update({
          where: { id: targetSQ.id },
          data: { startedAt: now, isClosed: false }
        });

        if (io) {
          const cleanOptions = (qData.options || []).map((o: any) => ({ id: o.id, text: o.text }));
          io.to(`session:${session.sessionCode}`).emit('session:question_started', {
            question: {
              id: qData.id,
              index: nextIdx,
              totalQuestions: session.sessionQuestions.length,
              text: qData.text,
              codeSnippet: qData.codeSnippet,
              image: qData.image,
              type: qData.type,
              points: qData.points,
              duration,
              category: qData.category,
              difficulty: qData.difficulty,
              options: cleanOptions,
              startedAt: now,
              deadline
            }
          });
        }

        const quizEngineNext = (global as any).quizEngine;
        if (quizEngineNext) {
          quizEngineNext.startQuestionTimer(session.sessionCode, session.id, duration);
        }

        return NextResponse.json({ success: true, currentQuestionIndex: nextIdx });
      }

      case 'CLOSE_QUESTION': {
        if (session.currentQuestionIndex < 0 || session.currentQuestionIndex >= session.sessionQuestions.length) {
          return NextResponse.json({ error: 'No active question to close' }, { status: 400 });
        }

        const quizEngineClose = (global as any).quizEngine;
        if (quizEngineClose) {
          quizEngineClose.clearSessionTimer(session.sessionCode);
        }

        const currentSQ = session.sessionQuestions[session.currentQuestionIndex];
        const qData = JSON.parse(currentSQ.snapshotData);

        await prisma.sessionQuestion.update({
          where: { id: currentSQ.id },
          data: { isClosed: true, endedAt: new Date() }
        });

        await prisma.quizSession.update({
          where: { id: session.id },
          data: { status: 'QUESTION_CLOSED' }
        });

        const responses = await prisma.participantResponse.findMany({
          where: { sessionQuestionId: currentSQ.id }
        });

        const optionDistribution: Record<string, number> = {};
        (qData.options || []).forEach((opt: any) => { optionDistribution[opt.id] = 0; });

        responses.forEach((res) => {
          try {
            const selected = JSON.parse(res.selectedOptionIds);
            selected.forEach((optId: string) => {
              if (optionDistribution[optId] !== undefined) optionDistribution[optId] += 1;
            });
          } catch (e) {}
        });

        const correctOptionIds = (qData.options || [])
          .filter((opt: any) => opt.isCorrect)
          .map((opt: any) => opt.id);

        const ranked = sortParticipants(session.participants);

        if (io) {
          io.to(`session:${session.sessionCode}`).emit('session:question_closed', {
            questionId: currentSQ.questionId,
            questionIndex: session.currentQuestionIndex,
            correctOptionIds,
            explanation: qData.explanation || null,
            optionDistribution,
            totalResponses: responses.length,
            totalParticipants: session.participants.length,
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

        return NextResponse.json({ success: true, message: 'Question closed' });
      }

      case 'SHOW_LEADERBOARD': {
        await prisma.quizSession.update({
          where: { id: session.id },
          data: { status: 'SHOW_LEADERBOARD' }
        });

        const ranked = sortParticipants(session.participants);

        if (io) {
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
        }

        return NextResponse.json({ success: true, leaderboard: ranked });
      }

      case 'COMPLETE_SESSION': {
        const quizEngineComplete = (global as any).quizEngine;
        if (quizEngineComplete) {
          quizEngineComplete.clearSessionTimer(session.sessionCode);
        }

        const ranked = sortParticipants(session.participants);

        for (let i = 0; i < ranked.length; i++) {
          await prisma.participant.update({
            where: { id: ranked[i].id },
            data: { finalRank: i + 1 }
          });
        }

        const completed = await prisma.quizSession.update({
          where: { id: session.id },
          data: {
            status: 'COMPLETED',
            endedAt: new Date(),
            isLive: false
          }
        });

        if (io) {
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
        }

        return NextResponse.json({ success: true, session: completed });
      }

      case 'RESET_SESSION': {
        const quizEngineReset = (global as any).quizEngine;
        if (quizEngineReset) {
          quizEngineReset.clearSessionTimer(session.sessionCode);
        }

        // Reset all responses and participant scores for re-running
        await prisma.participantResponse.deleteMany({
          where: { sessionId: session.id }
        });

        await prisma.participant.updateMany({
          where: { sessionId: session.id },
          data: {
            totalScore: 0,
            totalBonus: 0,
            correctCount: 0,
            incorrectCount: 0,
            unansweredCount: 0,
            totalResponseTimeMs: 0,
            averageResponseTimeMs: 0,
            finalRank: 0
          }
        });

        await prisma.sessionQuestion.updateMany({
          where: { sessionId: session.id },
          data: { startedAt: null, endedAt: null, isClosed: false }
        });

        const resetSession = await prisma.quizSession.update({
          where: { id: session.id },
          data: {
            status: 'WAITING_ROOM',
            currentQuestionIndex: -1,
            currentQuestionStartedAt: null,
            currentQuestionDeadline: null,
            isLive: true,
            startedAt: null,
            endedAt: null
          }
        });

        if (io) {
          io.to(`session:${session.sessionCode}`).emit('session:state', {
            session: {
              id: resetSession.id,
              code: resetSession.sessionCode,
              title: resetSession.title,
              status: resetSession.status,
              currentQuestionIndex: -1,
              totalQuestions: session.sessionQuestions.length,
              isLive: true,
              remainingSeconds: 0,
              participantCount: session.participants.length
            }
          });
        }

        return NextResponse.json({ success: true, message: 'Session reset to waiting room' });
      }

      case 'PAUSE_SESSION': {
        const quizEnginePause = (global as any).quizEngine;
        let result = { isPaused: true, isPauseScheduled: false };
        if (quizEnginePause && quizEnginePause.pauseSession) {
          result = await quizEnginePause.pauseSession(session.sessionCode, session.id);
        }
        return NextResponse.json({ success: true, ...result });
      }

      case 'RESUME_SESSION': {
        const quizEngineResume = (global as any).quizEngine;
        let result = { isPaused: false };
        if (quizEngineResume && quizEngineResume.resumeSession) {
          result = await quizEngineResume.resumeSession(session.sessionCode, session.id);
        }
        return NextResponse.json({ success: true, ...result });
      }

      case 'TOGGLE_PAUSE': {
        const quizEngineToggle = (global as any).quizEngine;
        let isCurrentlyPaused = false;
        if (quizEngineToggle && quizEngineToggle.sessionPausedState) {
          isCurrentlyPaused = !!quizEngineToggle.sessionPausedState.get(session.sessionCode);
        }
        let result;
        if (isCurrentlyPaused) {
          result = await quizEngineToggle.resumeSession(session.sessionCode, session.id);
        } else {
          result = await quizEngineToggle.pauseSession(session.sessionCode, session.id);
        }
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error handling session action:', error);
    return NextResponse.json({ error: 'Failed to process session action' }, { status: 500 });
  }
}
