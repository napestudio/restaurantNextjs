import { auth } from "@/lib/auth";
import { getUserRole } from "./roles";
import { UserRole } from "@/app/generated/prisma";
import { redirect } from "next/navigation";

/**
 * Require minimum role for page access
 * Usage: await requireRole(UserRole.MANAGER);
 */
export async function requireRole(minimumRole: UserRole): Promise<{
  userId: string;
  userRole: UserRole;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userRole = await getUserRole(session.user.id);

  if (!userRole) {
    redirect("/dashboard"); // No role assigned
  }

  const hierarchy = {
    SUPERADMIN: 4,
    ADMIN: 3,
    MANAGER: 2,
    WAITER: 1,
    EMPLOYEE: 1, // Backward compatibility
  };

  if (hierarchy[userRole] < hierarchy[minimumRole]) {
    redirect("/dashboard"); // Insufficient permissions
  }

  return { userId: session.user.id, userRole };
}

/**
 * Require minimum role for action
 * Simpler version - just checks role, throws error if unauthorized
 */
export async function authorizeAction(
  minimumRole: UserRole,
  errorMessage?: string
): Promise<{ userId: string; userRole: UserRole }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Not logged in");
  }

  const userRole = await getUserRole(session.user.id);

  if (!userRole) {
    throw new Error("Unauthorized: No role assigned");
  }

  const hierarchy = {
    SUPERADMIN: 4,
    ADMIN: 3,
    MANAGER: 2,
    WAITER: 1,
    EMPLOYEE: 1, // Backward compatibility
  };

  if (hierarchy[userRole] < hierarchy[minimumRole]) {
    throw new Error(errorMessage ?? "Forbidden: Insufficient permissions");
  }

  return { userId: session.user.id, userRole };
}
