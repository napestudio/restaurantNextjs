"use client";

import { getNavItems } from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import DashBoardNavItems from "./dashboard-nav-items";
import UserDropdown from "./user-dropdown";
interface DashboardNavProps {
  userName: string;
  hasAdminRole: boolean;
}

export function DashboardNav({ userName, hasAdminRole }: DashboardNavProps) {
  const navItems = getNavItems(hasAdminRole);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentPath = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b fixed w-full z-10">
      <div className="mx-auto px-4 sm:px-4 lg:px-4">
        <div className="flex items-center justify-between py-2">
          {/* Left: Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Administración</h1>
          </div>

          {/* Center: Desktop Nav Items */}
          <DashBoardNavItems navItems={navItems} />

          {/* Right: gg-ez-print Status, User Dropdown & Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <UserDropdown userName={userName} hasAdminRole={hasAdminRole} />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-900" />
              ) : (
                <Menu className="h-6 w-6 text-gray-900" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t py-2">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "font-bold text-white bg-red-500"
                        : "text-neutral-800 hover:bg-gray-100 hover:text-red-500",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
