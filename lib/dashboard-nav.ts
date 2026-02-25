import navConfig from "@/config/dashboard-nav.json";
import { PermissionGrant, UserRole } from "@/app/generated/prisma";
import { hasMinimumRole } from "@/lib/permissions/role-utils";
import { getUserPermissionGrants } from "@/lib/permissions/grant-utils";

export interface NavItem {
  label: string;
  href: string;
  minimumRole?: string;
  permissionGrant?: string;
}

/**
 * Returns nav items visible to the user based on their role and any extra
 * permission grants assigned to them for their primary branch.
 */
export async function getNavItems(
  userRole: UserRole | null,
  userId: string,
  branchId: string
): Promise<NavItem[]> {
  // Fetch all grants once (cached) to avoid N+1 per item
  const grants =
    userId && branchId
      ? await getUserPermissionGrants(userId, branchId)
      : ([] as PermissionGrant[]);

  return navConfig.items.filter((item) => {
    if (!item.minimumRole) return true;

    // Role hierarchy check passes
    if (hasMinimumRole(userRole, item.minimumRole as UserRole)) return true;

    // Fall back to explicit permission grant
    if (
      item.permissionGrant &&
      grants.includes(item.permissionGrant as PermissionGrant)
    ) {
      return true;
    }

    return false;
  });
}
