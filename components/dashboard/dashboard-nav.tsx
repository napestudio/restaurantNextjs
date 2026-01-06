import { getNavItems } from "@/lib/dashboard-nav";
import DashBoardNavItems from "./dashboard-nav-items";
import UserDropdown from "./user-dropdown";

interface DashboardNavProps {
  userName: string;
  hasAdminRole: boolean;
}

export function DashboardNav({ userName, hasAdminRole }: DashboardNavProps) {
  const navItems = getNavItems(hasAdminRole);

  return (
    <nav className="bg-white shadow-sm border-b fixed w-full z-10">
      <div className="mx-auto px-4 sm:px-4 lg:px-4">
        <div className="flex items-center justify-between flex-wrap py-2">
          <div className="flex ">
            <div className="shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Administración
              </h1>
            </div>
          </div>
          <DashBoardNavItems navItems={navItems} />
          <UserDropdown userName={userName} hasAdminRole={hasAdminRole} />
        </div>
      </div>
    </nav>
  );
}
