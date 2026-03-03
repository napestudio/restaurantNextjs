"use server";

import { PermissionGrant, UserRole } from "@/app/generated/prisma";
import { authorizeAction } from "@/lib/permissions/middleware";
import prisma from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import type { GrantRecord } from "@/lib/permissions/grant-utils";

/**
 * Upsert a permission override for a user in a branch.
 * granted=true → explicit allow (overrides role restriction)
 * granted=false → explicit deny (overrides role access)
 * SUPERADMIN only.
 */
export async function setUserPermission(
  userId: string,
  branchId: string,
  permission: PermissionGrant,
  granted: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId: grantedBy } = await authorizeAction(UserRole.ADMIN);

    await prisma.userPermissionGrant.upsert({
      where: {
        userId_branchId_permission: { userId, branchId, permission },
      },
      create: { userId, branchId, permission, granted, grantedBy },
      update: { granted, grantedAt: new Date(), grantedBy },
    });

    revalidateTag("user-permission-grants");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Remove an explicit permission override, reverting to role default.
 * SUPERADMIN only.
 */
export async function clearUserPermission(
  userId: string,
  branchId: string,
  permission: PermissionGrant
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction(UserRole.ADMIN);

    await prisma.userPermissionGrant.deleteMany({
      where: { userId, branchId, permission },
    });

    revalidateTag("user-permission-grants");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get all explicit permission overrides for a user in a branch.
 * SUPERADMIN only.
 */
export async function getUserGrantsForBranch(
  userId: string,
  branchId: string
): Promise<{ success: boolean; data?: GrantRecord[]; error?: string }> {
  try {
    await authorizeAction(UserRole.ADMIN);

    const grants = await prisma.userPermissionGrant.findMany({
      where: { userId, branchId },
      select: { permission: true, granted: true },
    });

    return { success: true, data: grants };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Async wrappers so existing callers keep working (server actions must be async)
export async function grantUserPermission(
  userId: string,
  branchId: string,
  permission: PermissionGrant
) {
  return setUserPermission(userId, branchId, permission, true);
}

export async function revokeUserPermission(
  userId: string,
  branchId: string,
  permission: PermissionGrant
) {
  return clearUserPermission(userId, branchId, permission);
}
