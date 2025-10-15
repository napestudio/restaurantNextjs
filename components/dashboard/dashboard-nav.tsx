import Link from "next/link";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/permissions";
import { getNavItems } from "@/lib/dashboard-nav";

export async function DashboardNav() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  // Check if user has admin role in any branch
  const hasAdminRole = await isUserAdmin(session.user.id);
  const navItems = getNavItems(hasAdminRole);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Panel de Administración
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    index === 0
                      ? "text-gray-900 hover:text-gray-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  prefetch
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-sm text-gray-700">
                {session.user.name || session.user.email}
              </span>
              {hasAdminRole && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
