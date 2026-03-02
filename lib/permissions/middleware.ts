import { auth } from "@/lib/auth";
import { getUserRoleAndBranchId } from "./roles";
import { PermissionGrant, UserRole } from "@/app/generated/prisma";
import { redirect } from "next/navigation";
import { getExplicitGrant } from "./grant-utils";

const hierarchy: Record<UserRole, number> = {
  SUPERADMIN: 4,
  ADMIN: 3,
  MANAGER: 2,
  WAITER: 1,
  EMPLOYEE: 1, // Backward compatibility
};

/**
 * Require minimum role for page access.
 * If a permissionGrant is provided, an explicit override takes full precedence over role:
 *   - Explicit ALLOW → access granted (even if role wouldn't allow)
 *   - Explicit DENY  → access denied (even if role would allow)
 *   - No override    → role hierarchy decides
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

  if (permissionGrant) {
    const explicit = await getExplicitGrant(
      session.user.id,
      branchId,
      permissionGrant
    );
    if (explicit !== null) {
      // Explicit override takes full precedence
      if (explicit) return { userId: session.user.id, userRole, branchId };
      redirect("/dashboard"); // Explicit deny
    }
  }

  // No explicit override — use role hierarchy
  if (hierarchy[userRole] >= hierarchy[minimumRole]) {
    return { userId: session.user.id, userRole, branchId };
  }

  redirect("/dashboard"); // Insufficient role
}

/**
 * Require minimum role for a server action.
 * Same override logic as requireRole but throws instead of redirecting.
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

  if (permissionGrant) {
    const explicit = await getExplicitGrant(
      session.user.id,
      branchId,
      permissionGrant
    );
    if (explicit !== null) {
      if (explicit) return { userId: session.user.id, userRole, branchId };
      throw new Error(errorMessage ?? "Forbidden: Permission explicitly denied");
    }
  }

  // No explicit override — use role hierarchy
  if (hierarchy[userRole] >= hierarchy[minimumRole]) {
    return { userId: session.user.id, userRole, branchId };
  }

  throw new Error(errorMessage ?? "Forbidden: Insufficient permissions");
}
