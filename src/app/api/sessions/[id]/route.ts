import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { sortParticipants } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const admin = await getSessionAdmin();

    // Search by ID or sessionCode
    const session = await prisma.quizSession.findFirst({
      where: {
        OR: [{ id }, { sessionCode: id }]
      },
      include: {
        quiz: true,
        sessionQuestions: {
          orderBy: { questionOrder: 'asc' },
          include: {
            responses: {
              include: {
                participant: {
                  select: { id: true, name: true, rollNumber: true, department: true }
                }
              }
            }
          }
        },
        participants: {
          orderBy: { totalScore: 'desc' }
        },
        responses: true
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const rankedParticipants = sortParticipants(session.participants);

    // If request is from authenticated admin, return full raw dataset
    if (admin) {
      return NextResponse.json({
        session,
        rankedParticipants,
        totalResponses: session.responses.length,
        activeParticipantCount: session.participants.filter(p => p.isConnected).length
      });
    }

    // If NON-ADMIN: Sanitize questions and participants to prevent cheating & leakage
    const isCompleted = session.status === 'COMPLETED';

    const sanitizedSessionQuestions = session.sessionQuestions.map((sq, idx) => {
      let qData: any = {};
      try {
        qData = JSON.parse(sq.snapshotData);
      } catch (e) {}

      // If session is completed, allow viewing explanations and correct answers for post-game review
      // If quiz is ongoing, only allow up to current question without revealing upcoming questions or isCorrect
      const isPastOrClosed = isCompleted || sq.isClosed || idx < session.currentQuestionIndex;

      if (!isCompleted && idx > session.currentQuestionIndex) {
        // Future question: Redact details completely
        return {
          id: sq.id,
          questionId: sq.questionId,
          questionOrder: sq.questionOrder,
          isClosed: sq.isClosed,
          startedAt: sq.startedAt,
          endedAt: sq.endedAt,
          snapshotData: JSON.stringify({
            id: qData.id,
            duration: qData.duration,
            points: qData.points
          }),
          responses: []
        };
      }

      const sanitizedOptions = (qData.options || []).map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: (isPastOrClosed || isCompleted) ? opt.isCorrect : undefined,
        explanation: (isPastOrClosed || isCompleted) ? opt.explanation : undefined
      }));

      return {
        id: sq.id,
        questionId: sq.questionId,
        questionOrder: sq.questionOrder,
        isClosed: sq.isClosed,
        startedAt: sq.startedAt,
        endedAt: sq.endedAt,
        snapshotData: JSON.stringify({
          id: qData.id,
          text: qData.text,
          codeSnippet: qData.codeSnippet,
          image: qData.image,
          type: qData.type,
          points: qData.points,
          duration: qData.duration,
          category: qData.category,
          difficulty: qData.difficulty,
          options: sanitizedOptions,
          explanation: (isPastOrClosed || isCompleted) ? qData.explanation : undefined
        }),
        responses: isPastOrClosed ? sq.responses : []
      };
    });

    const sanitizedParticipants = rankedParticipants.map((p, idx) => ({
      id: p.id,
      name: p.name,
      rollNumber: p.rollNumber,
      department: p.department,
      institution: p.institution,
      totalScore: p.totalScore,
      totalBonus: p.totalBonus,
      correctCount: p.correctCount,
      incorrectCount: p.incorrectCount,
      averageResponseTimeMs: p.averageResponseTimeMs,
      rank: idx + 1,
      isConnected: p.isConnected
    }));

    return NextResponse.json({
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        title: session.title,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        isLive: session.isLive,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        quiz: {
          id: session.quiz.id,
          title: session.quiz.title,
          subject: session.quiz.subject,
          defaultDuration: session.quiz.defaultDuration,
          baseMarks: session.quiz.baseMarks,
          maxBonus: session.quiz.maxBonus
        },
        sessionQuestions: sanitizedSessionQuestions
      },
      rankedParticipants: sanitizedParticipants,
      totalResponses: session.responses.length,
      activeParticipantCount: session.participants.filter(p => p.isConnected).length
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    return NextResponse.json({ error: 'Failed to fetch session details' }, { status: 500 });
  }
}
