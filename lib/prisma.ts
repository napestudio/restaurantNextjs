import { PrismaClient } from "@/app/generated/prisma";
import "server-only";

declare global {
  // Allow global var reuse in dev mode
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({});

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

// Export with proper index signature for PrismaAdapter compatibility
export default prisma as PrismaClient & { [key: string]: unknown };
