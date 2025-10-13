import { UserRole } from "@/app/generated/prisma";
import prisma from "@/lib/prisma";

/**
 * Check if a user has admin role in any branch
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const adminAccess = await prisma.userOnBranch.findFirst({
    where: {
      userId,
      role: UserRole.ADMIN,
    },
  });

  return !!adminAccess;
}

/**
 * Check if a user has admin role in a specific branch
 */
export async function isUserAdminInBranch(
  userId: string,
  branchId: string
): Promise<boolean> {
  const adminAccess = await prisma.userOnBranch.findFirst({
    where: {
      userId,
      branchId,
      role: UserRole.ADMIN,
    },
  });

  return !!adminAccess;
}

/**
 * Check if a user has at least manager role in a specific branch
 */
export async function isUserManagerOrAdmin(
  userId: string,
  branchId: string
): Promise<boolean> {
  const access = await prisma.userOnBranch.findFirst({
    where: {
      userId,
      branchId,
      role: {
        in: [UserRole.ADMIN, UserRole.MANAGER],
      },
    },
  });

  return !!access;
}

/**
 * Get all branches where user has a specific role
 */
export async function getUserBranchesByRole(
  userId: string,
  role?: UserRole
): Promise<string[]> {
  const userBranches = await prisma.userOnBranch.findMany({
    where: {
      userId,
      ...(role && { role }),
    },
    select: {
      branchId: true,
    },
  });

  return userBranches.map((ub) => ub.branchId);
}

/**
 * Get user's role in a specific branch
 */
export async function getUserRoleInBranch(
  userId: string,
  branchId: string
): Promise<UserRole | null> {
  const userBranch = await prisma.userOnBranch.findUnique({
    where: {
      userId_branchId: {
        userId,
        branchId,
      },
    },
    select: {
      role: true,
    },
  });

  return userBranch?.role ?? null;
}
