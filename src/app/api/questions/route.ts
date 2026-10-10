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
    const quizId = searchParams.get('quizId');
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');

    const whereClause: any = {};
    if (quizId) whereClause.quizId = quizId;
    if (category && category !== 'ALL') whereClause.category = category;
    if (difficulty && difficulty !== 'ALL') whereClause.difficulty = difficulty;
    if (search) {
      whereClause.OR = [
        { text: { contains: search } },
        { explanation: { contains: search } },
        { category: { contains: search } }
      ];
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        quiz: { select: { id: true, title: true } },
        options: { orderBy: { order: 'asc' } }
      },
      orderBy: [{ quizId: 'asc' }, { displayOrder: 'asc' }]
    });

    // Extract unique categories for filtering
    const categories = await prisma.question.groupBy({
      by: ['category'],
      where: { category: { not: null } }
    });

    return NextResponse.json({
      questions,
      categories: categories.map(c => c.category).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Check if bulk import or single question creation
    if (Array.isArray(body.questions)) {
      const { quizId, questions } = body;

      if (!quizId) {
        return NextResponse.json({ error: 'quizId is required for bulk import' }, { status: 400 });
      }

      const createdQuestions = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const newQ = await prisma.question.create({
          data: {
            quizId,
            text: q.text,
            codeSnippet: q.codeSnippet || null,
            image: q.image || null,
            type: q.type || 'MCQ_SINGLE',
            explanation: q.explanation || null,
            difficulty: q.difficulty || 'BEGINNER',
            category: q.category || 'General',
            points: Number(q.points) || 10,
            duration: Number(q.duration) || 30,
            displayOrder: i + 1,
            status: q.status || 'ACTIVE',
            options: {
              create: (q.options || []).map((opt: any, optIdx: number) => ({
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
                order: opt.order || (optIdx + 1),
                explanation: opt.explanation || null
              }))
            }
          },
          include: { options: true }
        });
        createdQuestions.push(newQ);
      }

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'BULK_IMPORT_QUESTIONS',
          targetType: 'Quiz',
          targetId: quizId,
          details: `Imported ${createdQuestions.length} questions into quiz ${quizId}`
        }
      });

      return NextResponse.json({ questions: createdQuestions, count: createdQuestions.length }, { status: 201 });
    }

    // Single Question Creation
    const {
      quizId,
      text,
      codeSnippet,
      image,
      type = 'MCQ_SINGLE',
      explanation,
      difficulty = 'BEGINNER',
      category = 'General',
      points = 10,
      duration = 30,
      status = 'ACTIVE',
      options = []
    } = body;

    if (!quizId || !text) {
      return NextResponse.json({ error: 'Quiz and question text are required' }, { status: 400 });
    }

    // Determine highest displayOrder
    const lastQuestion = await prisma.question.findFirst({
      where: { quizId },
      orderBy: { displayOrder: 'desc' }
    });
    const nextOrder = (lastQuestion?.displayOrder || 0) + 1;

    const question = await prisma.question.create({
      data: {
        quizId,
        text: text.trim(),
        codeSnippet: codeSnippet?.trim() || null,
        image: image || null,
        type,
        explanation: explanation?.trim() || null,
        difficulty,
        category: category?.trim() || 'General',
        points: Number(points) || 10,
        duration: Number(duration) || 30,
        displayOrder: nextOrder,
        status,
        options: {
          create: options.map((opt: any, idx: number) => ({
            text: opt.text,
            isCorrect: Boolean(opt.isCorrect),
            order: opt.order || (idx + 1),
            explanation: opt.explanation || null
          }))
        }
      },
      include: {
        options: true,
        quiz: { select: { title: true } }
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_QUESTION',
        targetType: 'Question',
        targetId: question.id,
        details: `Created question "${question.text.slice(0, 40)}..." in quiz "${question.quiz.title}"`
      }
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}

// Bulk re-ordering of questions
export async function PUT(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds array required' }, { status: 400 });
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await prisma.question.update({
        where: { id: orderedIds[i] },
        data: { displayOrder: i + 1 }
      });
    }

    return NextResponse.json({ success: true, message: 'Questions reordered successfully' });
  } catch (error) {
    console.error('Error reordering questions:', error);
    return NextResponse.json({ error: 'Failed to reorder questions' }, { status: 500 });
  }
}
