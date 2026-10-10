import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const quizzes = await prisma.quiz.findMany({
      where: {
        isArchived: false,
        OR: search
          ? [
              { title: { contains: search } },
              { subject: { contains: search } },
              { description: { contains: search } }
            ]
          : undefined
      },
      include: {
        _count: {
          select: {
            questions: true,
            sessions: true
          }
        },
        sessions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { status: true, isLive: true, sessionCode: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      subject,
      coverImage,
      defaultDuration = 30,
      baseMarks = 10,
      maxBonus = 10,
      negativeMarking = false,
      negativeMarks = 0,
      shuffleQuestions = false,
      shuffleOptions = false,
      showAnswerAfterQuestion = true,
      showLeaderboardAfterQuestion = true,
      allowLateJoin = true,
      showPersonalScore = true,
      maxParticipants = 500,
      instructions
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        subject: subject?.trim() || 'General Robotics',
        coverImage: coverImage || null,
        defaultDuration: Number(defaultDuration) || 30,
        baseMarks: Number(baseMarks) || 10,
        maxBonus: Number(maxBonus) || 10,
        negativeMarking: Boolean(negativeMarking),
        negativeMarks: Number(negativeMarks) || 0,
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        showAnswerAfterQuestion: Boolean(showAnswerAfterQuestion),
        showLeaderboardAfterQuestion: Boolean(showLeaderboardAfterQuestion),
        allowLateJoin: Boolean(allowLateJoin),
        showPersonalScore: Boolean(showPersonalScore),
        maxParticipants: maxParticipants ? Number(maxParticipants) : 500,
        instructions: instructions?.trim() || null
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_QUIZ',
        targetType: 'Quiz',
        targetId: quiz.id,
        details: `Created quiz "${quiz.title}"`
      }
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
}
