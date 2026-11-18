import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/levelup";

  const adapter = new PrismaPg({
    connectionString,
    // Force a UTC session. @prisma/adapter-pg turns timestamptz text into a
    // UTC instant by replacing its offset with "+00:00"; if the database
    // session uses a non-UTC timezone (e.g. Asia/Jakarta), every timestamptz
    // read/write is shifted by that offset. UTC keeps `startAt`/`endAt` exact.
    options: "-c timezone=UTC",
    // Prisma Postgres / managed Postgres uses valid certificates in production.
    // For local/self-signed development databases we relax validation.
    ssl: /sslmode=(require|verify-ca|verify-full)/.test(connectionString)
      ? undefined
      : undefined,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient } from "@/src/generated/prisma/client";
