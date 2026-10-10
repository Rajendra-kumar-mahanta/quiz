import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { sortParticipants } from '@/lib/scoring';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required for exports' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'json' or 'responses_csv'

    const session = await prisma.quizSession.findFirst({
      where: { OR: [{ id }, { sessionCode: id }] },
      include: {
        quiz: true,
        sessionQuestions: { orderBy: { questionOrder: 'asc' } },
        participants: true,
        responses: {
          include: {
            participant: true,
            sessionQuestion: true
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const ranked = sortParticipants(session.participants);

    if (format === 'responses_csv') {
      // Full granular response audit log
      const headers = [
        'Participant ID',
        'Participant Name',
        'Roll Number',
        'Department',
        'Institution',
        'Email',
        'Session Code',
        'Session Title',
        'Question Order',
        'Question Text',
        'Selected Answers',
        'Correctness',
        'Base Marks',
        'Speed Bonus',
        'Total Marks',
        'Response Time (ms)',
        'Server Timestamp',
        'Submission Status'
      ];

      const rows = session.responses.map(res => {
        let qText = '';
        let qOrder = 0;
        try {
          const qData = JSON.parse(res.sessionQuestion.snapshotData);
          qText = `"${(qData.text || '').replace(/"/g, '""')}"`;
          qOrder = res.sessionQuestion.questionOrder;
        } catch (e) {}

        const cleanSelected = `"${res.selectedOptionIds.replace(/"/g, '""')}"`;

        return [
          res.participantId,
          `"${(res.participant.name || '').replace(/"/g, '""')}"`,
          `"${(res.participant.rollNumber || '').replace(/"/g, '""')}"`,
          `"${(res.participant.department || '').replace(/"/g, '""')}"`,
          `"${(res.participant.institution || '').replace(/"/g, '""')}"`,
          `"${(res.participant.email || '').replace(/"/g, '""')}"`,
          session.sessionCode,
          `"${session.title.replace(/"/g, '""')}"`,
          qOrder,
          qText,
          cleanSelected,
          res.isCorrect ? 'CORRECT' : 'INCORRECT',
          res.baseMarks,
          res.speedBonus,
          res.totalMarks,
          res.responseTimeMs,
          new Date(res.serverReceivedAt).toISOString(),
          res.status
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="roboquest_${session.sessionCode}_detailed_responses.csv"`
        }
      });
    }

    if (format === 'csv') {
      // Participant Leaderboard and scores CSV
      const headers = [
        'Final Rank',
        'Participant Name',
        'Roll Number',
        'Department',
        'Institution',
        'Email',
        'Total Score',
        'Speed Bonus Points',
        'Correct Answers',
        'Incorrect Answers',
        'Average Response Time (ms)',
        'Joined At'
      ];

      const rows = ranked.map((p, idx) => [
        idx + 1,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.rollNumber || '').replace(/"/g, '""')}"`,
        `"${(p.department || '').replace(/"/g, '""')}"`,
        `"${(p.institution || '').replace(/"/g, '""')}"`,
        `"${(p.email || '').replace(/"/g, '""')}"`,
        p.totalScore,
        p.totalBonus,
        p.correctCount,
        p.incorrectCount,
        p.averageResponseTimeMs,
        new Date(p.joinedAt).toISOString()
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="roboquest_${session.sessionCode}_leaderboard.csv"`
        }
      });
    }

    // JSON export
    return NextResponse.json({
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        title: session.title,
        quizTitle: session.quiz.title,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt
      },
      summary: {
        totalParticipants: ranked.length,
        totalQuestions: session.sessionQuestions.length,
        totalResponses: session.responses.length,
        averageScore: ranked.length > 0 ? (ranked.reduce((acc, p) => acc + p.totalScore, 0) / ranked.length).toFixed(1) : 0,
        highestScore: ranked.length > 0 ? ranked[0].totalScore : 0
      },
      rankings: ranked.map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        rollNumber: p.rollNumber,
        department: p.department,
        institution: p.institution,
        email: p.email,
        totalScore: p.totalScore,
        totalBonus: p.totalBonus,
        correctCount: p.correctCount,
        incorrectCount: p.incorrectCount,
        averageResponseTimeMs: p.averageResponseTimeMs
      }))
    });

  } catch (error) {
    console.error('Error exporting session report:', error);
    return NextResponse.json({ error: 'Failed to export session' }, { status: 500 });
  }
}
