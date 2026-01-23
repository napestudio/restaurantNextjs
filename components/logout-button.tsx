"use client";

import { signOut } from "next-auth/react";
import { showLogoutOverlay } from "@/contexts/logout-context";

export default function LogoutButton() {
  const handleLogout = async () => {
    showLogoutOverlay();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
    >
      Cerrar sesión
    </button>
  );
}
