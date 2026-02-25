import "server-only";
import { PermissionGrant } from "@/app/generated/prisma";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

/**
 * Get all permission grants for a user in a specific branch.
 * Cached for 5 minutes with tag "user-permission-grants".
 */
export const getUserPermissionGrants = unstable_cache(
  async (userId: string, branchId: string): Promise<PermissionGrant[]> => {
    const grants = await prisma.userPermissionGrant.findMany({
      where: { userId, branchId },
      select: { permission: true },
    });
    return grants.map((g) => g.permission);
  },
  ["user-permission-grants"],
  {
    revalidate: 300,
    tags: ["user-permission-grants"],
  }
);

/**
 * Check if a user has a specific permission grant in a branch.
 */
export async function hasPermissionGrant(
  userId: string,
  branchId: string,
  permission: PermissionGrant
): Promise<boolean> {
  const grants = await getUserPermissionGrants(userId, branchId);
  return grants.includes(permission);
}
