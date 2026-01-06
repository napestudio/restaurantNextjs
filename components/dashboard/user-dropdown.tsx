"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import StarIcon from "../ui/star-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface UserDropdownProps {
  userName: string;
  hasAdminRole: boolean;
}

export default function UserDropdown({
  userName,
  hasAdminRole,
}: UserDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
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
          disabled={isLoading}
          variant="destructive"
          className="cursor-pointer"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin size-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saliendo...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
