"use server";

import { PermissionGrant, UserRole } from "@/app/generated/prisma";
import { authorizeAction } from "@/lib/permissions/middleware";
import prisma from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function grantUserPermission(
  userId: string,
  branchId: string,
  permission: PermissionGrant
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId: grantedBy } = await authorizeAction(UserRole.SUPERADMIN);

    await prisma.userPermissionGrant.upsert({
      where: {
        userId_branchId_permission: { userId, branchId, permission },
      },
      create: { userId, branchId, permission, grantedBy },
      update: { grantedAt: new Date(), grantedBy },
    });

    revalidateTag("user-permission-grants");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function revokeUserPermission(
  userId: string,
  branchId: string,
  permission: PermissionGrant
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction(UserRole.SUPERADMIN);

    await prisma.userPermissionGrant.delete({
      where: {
        userId_branchId_permission: { userId, branchId, permission },
      },
    });

    revalidateTag("user-permission-grants");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getUserGrantsForBranch(
  userId: string,
  branchId: string
): Promise<{ success: boolean; data?: PermissionGrant[]; error?: string }> {
  try {
    await authorizeAction(UserRole.SUPERADMIN);

    const grants = await prisma.userPermissionGrant.findMany({
      where: { userId, branchId },
      select: { permission: true },
    });

    return { success: true, data: grants.map((g) => g.permission) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
