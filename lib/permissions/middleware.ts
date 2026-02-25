import { auth } from "@/lib/auth";
import { getUserRoleAndBranchId } from "./roles";
import { PermissionGrant, UserRole } from "@/app/generated/prisma";
import { redirect } from "next/navigation";
import { hasPermissionGrant } from "./grant-utils";

const hierarchy: Record<UserRole, number> = {
  SUPERADMIN: 4,
  ADMIN: 3,
  MANAGER: 2,
  WAITER: 1,
  EMPLOYEE: 1, // Backward compatibility
};

/**
 * Require minimum role for page access.
 * If the role check fails and a permissionGrant is provided, falls back to
 * checking whether the user has that specific grant in their primary branch.
 * Usage: await requireRole(UserRole.MANAGER, PermissionGrant.VIEW_STATISTICS);
 */
export async function requireRole(
  minimumRole: UserRole,
  permissionGrant?: PermissionGrant
): Promise<{
  userId: string;
  userRole: UserRole;
  branchId: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userInfo = await getUserRoleAndBranchId(session.user.id);

  if (!userInfo) {
    redirect("/dashboard"); // No role assigned
  }

  const { role: userRole, branchId } = userInfo;

  if (hierarchy[userRole] >= hierarchy[minimumRole]) {
    return { userId: session.user.id, userRole, branchId };
  }

  // Role check failed — try permission grant fallback
  if (permissionGrant) {
    const granted = await hasPermissionGrant(
      session.user.id,
      branchId,
      permissionGrant
    );
    if (granted) {
      return { userId: session.user.id, userRole, branchId };
    }
  }

  redirect("/dashboard"); // Insufficient permissions
}

/**
 * Require minimum role for a server action.
 * If the role check fails and a permissionGrant is provided, falls back to
 * checking whether the user has that specific grant.
 * Throws an error if unauthorized (instead of redirecting).
 */
export async function authorizeAction(
  minimumRole: UserRole,
  errorMessage?: string,
  permissionGrant?: PermissionGrant
): Promise<{ userId: string; userRole: UserRole; branchId: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Not logged in");
  }

  const userInfo = await getUserRoleAndBranchId(session.user.id);

  if (!userInfo) {
    throw new Error("Unauthorized: No role assigned");
  }

  const { role: userRole, branchId } = userInfo;

  if (hierarchy[userRole] >= hierarchy[minimumRole]) {
    return { userId: session.user.id, userRole, branchId };
  }

  // Role check failed — try permission grant fallback
  if (permissionGrant) {
    const granted = await hasPermissionGrant(
      session.user.id,
      branchId,
      permissionGrant
    );
    if (granted) {
      return { userId: session.user.id, userRole, branchId };
    }
  }

  throw new Error(errorMessage ?? "Forbidden: Insufficient permissions");
}
