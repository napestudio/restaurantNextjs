"use server";

import { auth } from "@/lib/auth";
import { getUserBranchesByRole } from "@/lib/permissions";
import { BRANCH_ID } from "@/lib/constants";

/**
 * Get the current user's primary branch ID
 * Falls back to BRANCH_ID env var for backward compatibility
 */
export async function getCurrentUserBranchId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return BRANCH_ID;

  // Get user's branches
  const userBranches = await getUserBranchesByRole(session.user.id);

  if (userBranches.length === 0) {
    // No branches assigned - fallback to env var
    return BRANCH_ID;
  }

  // Return first branch (primary)
  // TODO: In future, support branch switching
  return userBranches[0];
}
