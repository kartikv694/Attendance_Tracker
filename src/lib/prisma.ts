// Single shared Prisma client for the whole app.
// Without this, Next.js hot-reload in dev would spin up a fresh client
// (and a fresh DB connection pool) on every file change and eventually
// exhaust Postgres' connection limit.

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
};

// the adapter (and the pg connection pool underneath it) needs the same
// hot-reload guard as the client itself - without this, every dev-mode
// file save was creating a BRAND NEW pool alongside the old ones,
// leaving prior pools open and unused. That's the real reason requests
// were feeling slow, not just log noise.
const adapter =
  globalForPrisma.prismaAdapter ||
  new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    // only real errors/warnings print now - "query" logged every single
    // SQL statement Prisma ran, which is useful occasionally but not
    // something you want permanently flooding the terminal
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdapter = adapter;
}
