import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    // 1. Overall counts
    const totalQuizzes = await prisma.quiz.count({ where: { isArchived: false } });
    const totalQuestions = await prisma.question.count();
    const totalSessions = await prisma.quizSession.count();
    const totalParticipants = await prisma.participant.count();
    const totalResponses = await prisma.participantResponse.count();

    // 2. Active sessions
    const activeSessions = await prisma.quizSession.findMany({
      where: { status: { in: ['WAITING_ROOM', 'ACTIVE_QUESTION', 'QUESTION_CLOSED', 'SHOW_LEADERBOARD'] } },
      include: {
        quiz: { select: { title: true } },
        _count: { select: { participants: true, responses: true } }
      }
    });

    // 3. Response Accuracy and stats
    const correctResponses = await prisma.participantResponse.count({ where: { isCorrect: true } });
    const overallAccuracy = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;

    // 4. Response Time calculation
    const avgResponseTime = await prisma.participantResponse.aggregate({
      _avg: { responseTimeMs: true }
    });

    // 5. Category Breakdown
    const categoryStats = await prisma.question.groupBy({
      by: ['category'],
      _count: { id: true }
    });

    // 6. Top Performers across sessions or specified session
    const topPerformers = await prisma.participant.findMany({
      where: sessionId ? { sessionId } : undefined,
      orderBy: [{ totalScore: 'desc' }, { correctCount: 'desc' }],
      take: 10,
      include: {
        session: { select: { title: true, sessionCode: true } }
      }
    });

    // 7. Question-wise analysis (for targeted session or general)
    let questionMetrics: any[] = [];
    if (sessionId) {
      const sessionQuestions = await prisma.sessionQuestion.findMany({
        where: { sessionId },
        orderBy: { questionOrder: 'asc' },
        include: {
          responses: true
        }
      });

      questionMetrics = sessionQuestions.map(sq => {
        let qData = { text: 'Question', category: 'General' };
        try {
          qData = JSON.parse(sq.snapshotData);
        } catch (e) {}

        const totalResp = sq.responses.length;
        const correctCount = sq.responses.filter(r => r.isCorrect).length;
        const accuracy = totalResp > 0 ? Math.round((correctCount / totalResp) * 100) : 0;
        const avgTime = totalResp > 0 ? Math.round(sq.responses.reduce((sum, r) => sum + r.responseTimeMs, 0) / totalResp) : 0;

        return {
          questionOrder: sq.questionOrder,
          text: qData.text,
          category: qData.category,
          totalResponses: totalResp,
          correctCount,
          accuracy,
          avgResponseTimeMs: avgTime
        };
      });
    }

    return NextResponse.json({
      metrics: {
        totalQuizzes,
        totalQuestions,
        totalSessions,
        totalParticipants,
        totalResponses,
        overallAccuracy,
        avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
        activeSessionsCount: activeSessions.length
      },
      activeSessions,
      categoryStats: categoryStats.map(c => ({
        category: c.category || 'General',
        count: c._count.id
      })),
      topPerformers,
      questionMetrics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
