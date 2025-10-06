import navConfig from "@/config/dashboard-nav.json";

export interface NavItem {
  label: string;
  href: string;
  adminOnly: boolean;
}

export function getNavItems(isAdmin: boolean): NavItem[] {
  return navConfig.items.filter((item) => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });
}
