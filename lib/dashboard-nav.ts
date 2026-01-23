import navConfig from "@/config/dashboard-nav.json";
import { UserRole } from "@/app/generated/prisma";
import { hasMinimumRole } from "@/lib/permissions/role-utils";

export interface NavItem {
  label: string;
  href: string;
  minimumRole?: string;
}

export function getNavItems(userRole: UserRole | null): NavItem[] {
  return navConfig.items.filter((item) => {
    if (!item.minimumRole) return true;
    return hasMinimumRole(userRole, item.minimumRole as UserRole);
  });
}
