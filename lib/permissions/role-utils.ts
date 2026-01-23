import { UserRole } from "@/app/generated/prisma";

/**
 * Client-safe role utilities (no database access)
 * These functions can be imported in both client and server components
 */

/**
 * Check if user has minimum required role
 * Hierarchy: SUPERADMIN > ADMIN > MANAGER > WAITER
 * (EMPLOYEE deprecated - treat as WAITER)
 */
export function hasMinimumRole(
  userRole: UserRole | null,
  requiredRole: UserRole
): boolean {
  if (!userRole) return false;

  const hierarchy = {
    SUPERADMIN: 4,
    ADMIN: 3,
    MANAGER: 2,
    WAITER: 1,
    EMPLOYEE: 1, // Backward compatibility
  };

  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Check if user is admin or higher
 */
export function isAdminOrHigher(role: UserRole | null): boolean {
  return role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
}

/**
 * Check if user is manager or higher
 */
export function isManagerOrHigher(role: UserRole | null): boolean {
  return (
    role === UserRole.SUPERADMIN ||
    role === UserRole.ADMIN ||
    role === UserRole.MANAGER
  );
}
