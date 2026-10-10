import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionCode,
      name,
      rollNumber,
      department,
      institution,
      email,
      joinPin,
      existingToken
    } = body;

    if (!sessionCode) {
      return NextResponse.json({ error: 'Session Code is required' }, { status: 400 });
    }

    const cleanCode = sessionCode.trim().toUpperCase();

    const session = await prisma.quizSession.findUnique({
      where: { sessionCode: cleanCode },
      include: {
        quiz: true,
        _count: { select: { participants: true } }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Quiz session not found with code: ' + cleanCode }, { status: 404 });
    }

    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This quiz session has already concluded.' }, { status: 400 });
    }

    // Check PIN if session has a PIN configured
    if (session.joinPin && session.joinPin.trim() !== '') {
      if (!joinPin || joinPin.trim() !== session.joinPin.trim()) {
        return NextResponse.json({ error: 'Incorrect session PIN.' }, { status: 403 });
      }
    }

    // Check max participants
    if (session.quiz.maxParticipants && session._count.participants >= session.quiz.maxParticipants) {
      return NextResponse.json({ error: 'This session has reached the maximum participant capacity.' }, { status: 403 });
    }

    // 1. Reconnection handling via existingToken
    if (existingToken) {
      const existingParticipant = await prisma.participant.findUnique({
        where: { sessionToken: existingToken }
      });

      if (existingParticipant && existingParticipant.sessionId === session.id) {
        // Update connection status
        const updated = await prisma.participant.update({
          where: { id: existingParticipant.id },
          data: { isConnected: true, lastSeenAt: new Date() }
        });

        return NextResponse.json({
          success: true,
          reconnected: true,
          sessionToken: existingParticipant.sessionToken,
          participant: {
            id: updated.id,
            name: updated.name,
            rollNumber: updated.rollNumber,
            department: updated.department,
            institution: updated.institution,
            email: updated.email,
            totalScore: updated.totalScore
          },
          session: {
            id: session.id,
            code: session.sessionCode,
            title: session.title,
            status: session.status,
            quizTitle: session.quiz.title
          }
        });
      }
    }

    // 2. New Registration
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Your name is required to join' }, { status: 400 });
    }

    const sessionToken = crypto.randomUUID();

    const participant = await prisma.participant.create({
      data: {
        sessionId: session.id,
        name: name.trim(),
        rollNumber: rollNumber?.trim() || null,
        department: department?.trim() || null,
        institution: institution?.trim() || null,
        email: email?.trim().toLowerCase() || null,
        sessionToken,
        isConnected: true
      }
    });

    // Notify connected room
    const io = (global as any).io;
    if (io) {
      io.to(`session:${session.sessionCode}`).emit('session:participant_joined', {
        participant: {
          id: participant.id,
          name: participant.name,
          department: participant.department
        },
        totalParticipants: session._count.participants + 1
      });
    }

    return NextResponse.json({
      success: true,
      reconnected: false,
      sessionToken,
      participant: {
        id: participant.id,
        name: participant.name,
        rollNumber: participant.rollNumber,
        department: participant.department,
        institution: participant.institution,
        email: participant.email,
        totalScore: participant.totalScore
      },
      session: {
        id: session.id,
        code: session.sessionCode,
        title: session.title,
        status: session.status,
        quizTitle: session.quiz.title
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in participant join:', error);
    return NextResponse.json({ error: 'Failed to join quiz session' }, { status: 500 });
  }
}
