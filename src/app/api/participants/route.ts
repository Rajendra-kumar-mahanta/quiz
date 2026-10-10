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
    const search = searchParams.get('search');
    const department = searchParams.get('department');

    const whereClause: any = {};
    if (sessionId) whereClause.sessionId = sessionId;
    if (department && department !== 'ALL') whereClause.department = department;
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { rollNumber: { contains: search } },
        { department: { contains: search } },
        { institution: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const participants = await prisma.participant.findMany({
      where: whereClause,
      include: {
        session: {
          select: {
            id: true,
            sessionCode: true,
            title: true,
            status: true
          }
        },
        _count: {
          select: { responses: true }
        }
      },
      orderBy: [{ totalScore: 'desc' }, { joinedAt: 'desc' }]
    });

    const departments = await prisma.participant.groupBy({
      by: ['department'],
      where: { department: { not: null } }
    });

    return NextResponse.json({
      participants,
      departments: departments.map(d => d.department).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }
}
