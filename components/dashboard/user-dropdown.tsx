"use client";

import { signOut } from "next-auth/react";
import { LogOut, ChevronDown } from "lucide-react";
import StarIcon from "../ui/star-icon";
import { showLogoutOverlay } from "@/contexts/logout-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { UserRole } from "@/app/generated/prisma";
import { isAdminOrHigher } from "@/lib/permissions/role-utils";

interface UserDropdownProps {
  userName: string;
  userRole: UserRole | null;
}

export default function UserDropdown({
  userName,
  userRole,
}: UserDropdownProps) {
  const hasAdminRole = isAdminOrHigher(userRole);

  const handleLogout = async () => {
    showLogoutOverlay();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer">
        {hasAdminRole && (
          <span className="text-red-500">
            <StarIcon />
          </span>
        )}
        {userName}
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleLogout}
          variant="destructive"
          className="cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
