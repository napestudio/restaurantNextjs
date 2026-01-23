import "server-only";
import { UserRole } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Server-only role functions (require database access)
 * For client-safe utilities, import from "./role-utils" instead
 */

/**
 * Get user's role in their primary branch
 * Simple, no caching needed for now
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const userOnBranch = await prisma.userOnBranch.findFirst({
    where: { userId },
    select: { role: true },
  });

  return userOnBranch?.role ?? null;
}

// Re-export client-safe utilities for convenience
export {
  hasMinimumRole,
  isAdminOrHigher,
  isManagerOrHigher,
} from "./role-utils";
