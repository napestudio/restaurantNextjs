import { auth } from "@/lib/auth";
import { getNavItems } from "@/lib/dashboard-nav";
import { isUserAdmin } from "@/lib/permissions";
import StarIcon from "../ui/star-icon";
import DashBoardNavItems from "./dashboard-nav-items";
import LogoutButton from "../logout-button";

export async function DashboardNav() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  // Check if user has admin role in any branch
  const hasAdminRole = await isUserAdmin(session.user.id);
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
          <div className="flex items-center gap-2">
            <div className="shrink-0">
              <span className="text-sm text-gray-700 relative flex items-center gap-1">
                {hasAdminRole && (
                  <span className="text-red-500">
                    <StarIcon />
                  </span>
                )}
                {session.user.name || session.user.email}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
