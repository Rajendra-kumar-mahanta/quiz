import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Optimize SQLite for high concurrency (120+ concurrent participants)
if (process.env.DATABASE_URL?.includes('file:') || !process.env.DATABASE_URL) {
  prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;'))
    .then(() => prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;'))
    .then(() => prisma.$queryRawUnsafe('PRAGMA cache_size = -64000;'))
    .catch(() => {});
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
