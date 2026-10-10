import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

function generateSessionCode(): string {
  // Generate 6-character alphanumeric uppercase code (avoiding ambiguous chars like O, 0, 1, I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    const sessions = await prisma.quizSession.findMany({
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            subject: true,
            defaultDuration: true,
            baseMarks: true,
            maxBonus: true
          }
        },
        _count: {
          select: {
            participants: true,
            sessionQuestions: true,
            responses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { quizId, title, joinPin, allowLateJoin = true } = body;

    if (!quizId) {
      return NextResponse.json({ error: 'quizId is required' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          where: { status: 'ACTIVE' },
          orderBy: { displayOrder: 'asc' },
          include: {
            options: { orderBy: { order: 'asc' } }
          }
        }
      }
    });

    if (!quiz || quiz.questions.length === 0) {
      return NextResponse.json(
        { error: 'Quiz not found or has no active questions' },
        { status: 400 }
      );
    }

    // Generate unique session code
    let sessionCode = generateSessionCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.quizSession.findUnique({ where: { sessionCode } });
      if (!existing) isUnique = true;
      else sessionCode = generateSessionCode();
    }

    // Prepare questions ordering (apply shuffle if enabled in quiz)
    let questionsToSnapshot = [...quiz.questions];
    if (quiz.shuffleQuestions) {
      questionsToSnapshot.sort(() => Math.random() - 0.5);
    }

    // Create session and snapshot questions
    const session = await prisma.quizSession.create({
      data: {
        sessionCode,
        quizId,
        title: title?.trim() || `${quiz.title} — Session #${sessionCode}`,
        status: 'WAITING_ROOM',
        currentQuestionIndex: -1,
        joinPin: joinPin?.trim() || null,
        allowLateJoin: Boolean(allowLateJoin),
        isLive: true,
        sessionQuestions: {
          create: questionsToSnapshot.map((q, idx) => {
            let options = [...q.options];
            if (quiz.shuffleOptions) {
              options.sort(() => Math.random() - 0.5);
            }

            const snapshot = {
              id: q.id,
              text: q.text,
              codeSnippet: q.codeSnippet,
              image: q.image,
              type: q.type,
              explanation: q.explanation,
              difficulty: q.difficulty,
              category: q.category,
              points: q.points || quiz.baseMarks,
              duration: q.duration || quiz.defaultDuration,
              options: options.map(opt => ({
                id: opt.id,
                text: opt.text,
                isCorrect: opt.isCorrect,
                order: opt.order,
                explanation: opt.explanation
              }))
            };

            return {
              questionId: q.id,
              questionOrder: idx + 1,
              snapshotData: JSON.stringify(snapshot)
            };
          })
        }
      },
      include: {
        sessionQuestions: true,
        quiz: true
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_SESSION',
        targetType: 'QuizSession',
        targetId: session.id,
        details: `Created session "${session.title}" (Code: ${session.sessionCode}) with ${session.sessionQuestions.length} questions`
      }
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
