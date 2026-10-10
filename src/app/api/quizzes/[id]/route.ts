import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { displayOrder: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' }
            }
          }
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            _count: {
              select: { participants: true, responses: true }
            }
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}

export async function PUT(
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

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        subject: body.subject,
        coverImage: body.coverImage,
        defaultDuration: Number(body.defaultDuration),
        baseMarks: Number(body.baseMarks),
        maxBonus: Number(body.maxBonus),
        negativeMarking: Boolean(body.negativeMarking),
        negativeMarks: Number(body.negativeMarks),
        shuffleQuestions: Boolean(body.shuffleQuestions),
        shuffleOptions: Boolean(body.shuffleOptions),
        showAnswerAfterQuestion: Boolean(body.showAnswerAfterQuestion),
        showLeaderboardAfterQuestion: Boolean(body.showLeaderboardAfterQuestion),
        allowLateJoin: Boolean(body.allowLateJoin),
        showPersonalScore: Boolean(body.showPersonalScore),
        maxParticipants: body.maxParticipants ? Number(body.maxParticipants) : null,
        instructions: body.instructions
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_QUIZ',
        targetType: 'Quiz',
        targetId: id,
        details: `Updated quiz "${updatedQuiz.title}"`
      }
    });

    return NextResponse.json({ quiz: updatedQuiz });
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const quiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    await prisma.quiz.delete({
      where: { id }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'DELETE_QUIZ',
        targetType: 'Quiz',
        targetId: id,
        details: `Deleted quiz "${quiz.title}"`
      }
    });

    return NextResponse.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}

// POST to duplicate quiz
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

    const sourceQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    if (!sourceQuiz) {
      return NextResponse.json({ error: 'Source quiz not found' }, { status: 404 });
    }

    const newQuiz = await prisma.quiz.create({
      data: {
        title: `${sourceQuiz.title} (Copy)`,
        description: sourceQuiz.description,
        subject: sourceQuiz.subject,
        coverImage: sourceQuiz.coverImage,
        defaultDuration: sourceQuiz.defaultDuration,
        baseMarks: sourceQuiz.baseMarks,
        maxBonus: sourceQuiz.maxBonus,
        negativeMarking: sourceQuiz.negativeMarking,
        negativeMarks: sourceQuiz.negativeMarks,
        shuffleQuestions: sourceQuiz.shuffleQuestions,
        shuffleOptions: sourceQuiz.shuffleOptions,
        showAnswerAfterQuestion: sourceQuiz.showAnswerAfterQuestion,
        showLeaderboardAfterQuestion: sourceQuiz.showLeaderboardAfterQuestion,
        allowLateJoin: sourceQuiz.allowLateJoin,
        showPersonalScore: sourceQuiz.showPersonalScore,
        maxParticipants: sourceQuiz.maxParticipants,
        instructions: sourceQuiz.instructions,
        questions: {
          create: sourceQuiz.questions.map((q) => ({
            text: q.text,
            codeSnippet: q.codeSnippet,
            image: q.image,
            type: q.type,
            explanation: q.explanation,
            difficulty: q.difficulty,
            category: q.category,
            points: q.points,
            duration: q.duration,
            displayOrder: q.displayOrder,
            status: q.status,
            options: {
              create: q.options.map((opt) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                order: opt.order,
                explanation: opt.explanation
              }))
            }
          }))
        }
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'DUPLICATE_QUIZ',
        targetType: 'Quiz',
        targetId: newQuiz.id,
        details: `Duplicated quiz "${sourceQuiz.title}" to "${newQuiz.title}"`
      }
    });

    return NextResponse.json({ quiz: newQuiz }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating quiz:', error);
    return NextResponse.json({ error: 'Failed to duplicate quiz' }, { status: 500 });
  }
}
