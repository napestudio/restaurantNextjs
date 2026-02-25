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
 * Returns nav items visible to the user.
 * Explicit grants take full precedence over role:
 *   - Explicit ALLOW → show item (even if role wouldn't)
 *   - Explicit DENY  → hide item (even if role would show it)
 *   - No override    → role decides
 */
export async function getNavItems(
  userRole: UserRole | null,
  userId: string,
  branchId: string
): Promise<NavItem[]> {
  const grants =
    userId && branchId
      ? await getUserPermissionGrants(userId, branchId)
      : [];

  const grantMap = new Map(grants.map((g) => [g.permission, g.granted]));

  return navConfig.items.filter((item) => {
    if (!item.minimumRole) return true;

    if (item.permissionGrant) {
      const explicit = grantMap.get(item.permissionGrant as PermissionGrant);
      if (explicit !== undefined) return explicit; // override takes full precedence
    }

    // No explicit override — use role hierarchy
    return hasMinimumRole(userRole, item.minimumRole as UserRole);
  });
}
