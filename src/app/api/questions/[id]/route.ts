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
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        quiz: { select: { id: true, title: true } },
        options: { orderBy: { order: 'asc' } }
      }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
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

    const {
      text,
      codeSnippet,
      image,
      type,
      explanation,
      difficulty,
      category,
      points,
      duration,
      status,
      options = []
    } = body;

    // Delete existing options and replace with new set
    await prisma.answerOption.deleteMany({
      where: { questionId: id }
    });

    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: {
        text: text?.trim(),
        codeSnippet: codeSnippet?.trim() || null,
        image: image || null,
        type: type || 'MCQ_SINGLE',
        explanation: explanation?.trim() || null,
        difficulty: difficulty || 'BEGINNER',
        category: category?.trim() || 'General',
        points: Number(points) || 10,
        duration: Number(duration) || 30,
        status: status || 'ACTIVE',
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
        options: { orderBy: { order: 'asc' } }
      }
    });

    return NextResponse.json({ question: updatedQuestion });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
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

    await prisma.question.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}

// POST duplicate question
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
    const source = await prisma.question.findUnique({
      where: { id },
      include: { options: true }
    });

    if (!source) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const lastQ = await prisma.question.findFirst({
      where: { quizId: source.quizId },
      orderBy: { displayOrder: 'desc' }
    });
    const nextOrder = (lastQ?.displayOrder || 0) + 1;

    const newQuestion = await prisma.question.create({
      data: {
        quizId: source.quizId,
        text: `${source.text} (Copy)`,
        codeSnippet: source.codeSnippet,
        image: source.image,
        type: source.type,
        explanation: source.explanation,
        difficulty: source.difficulty,
        category: source.category,
        points: source.points,
        duration: source.duration,
        displayOrder: nextOrder,
        status: source.status,
        options: {
          create: source.options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: opt.order,
            explanation: opt.explanation
          }))
        }
      },
      include: { options: true }
    });

    return NextResponse.json({ question: newQuestion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate question' }, { status: 500 });
  }
}
