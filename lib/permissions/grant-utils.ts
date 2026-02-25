import "server-only";
import { PermissionGrant } from "@/app/generated/prisma";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type GrantRecord = { permission: PermissionGrant; granted: boolean };

/**
 * Get all explicit permission records for a user in a specific branch.
 * Returns both ALLOW (granted=true) and DENY (granted=false) records.
 * Cached for 5 minutes with tag "user-permission-grants".
 */
export const getUserPermissionGrants = unstable_cache(
  async (userId: string, branchId: string): Promise<GrantRecord[]> => {
    const grants = await prisma.userPermissionGrant.findMany({
      where: { userId, branchId },
      select: { permission: true, granted: true },
    });
    return grants;
  },
  ["user-permission-grants"],
  {
    revalidate: 300,
    tags: ["user-permission-grants"],
  }
);

/**
 * Get the explicit override for a specific permission.
 * Returns true (explicit ALLOW), false (explicit DENY), or null (no override — role decides).
 */
export async function getExplicitGrant(
  userId: string,
  branchId: string,
  permission: PermissionGrant
): Promise<boolean | null> {
  const grants = await getUserPermissionGrants(userId, branchId);
  const record = grants.find((g) => g.permission === permission);
  return record?.granted ?? null;
}
