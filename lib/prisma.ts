import { PrismaClient } from "@/app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "server-only";

declare global {
  // Allow global var reuse in dev mode
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

global.prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
  });

export const prisma = global.prisma;

// Export with proper index signature for PrismaAdapter compatibility
export default prisma as PrismaClient & { [key: string]: unknown };
