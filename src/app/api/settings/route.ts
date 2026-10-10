import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin, hashPassword, comparePassword } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auditLogs = await prisma.adminAuditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { name: true, email: true } }
      }
    });

    return NextResponse.json({
      admin,
      systemInfo: {
        platform: 'ROBOQUEST v1.0.0',
        nodeVersion: process.version,
        database: 'SQLite (Prisma ORM)',
        serverTime: new Date().toISOString()
      },
      auditLogs
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, currentPassword, newPassword, newName } = body;

    if (action === 'UPDATE_PASSWORD') {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: admin.id } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash: newHash, name: newName || user.name }
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'UPDATE_PASSWORD',
          targetType: 'User',
          targetId: admin.id,
          details: 'Admin updated their password'
        }
      });

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
