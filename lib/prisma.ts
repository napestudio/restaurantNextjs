import { PrismaClient } from "@/app/generated/prisma";
import "server-only";

declare global {
  // Allow global var reuse in dev mode
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({});

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;
