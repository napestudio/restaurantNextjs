"use client";

import { useLogout } from "@/contexts/logout-context";
import SushiLoader from "./dashboard/sushi-loader";

export function LogoutOverlay() {
  const { isLoggingOut } = useLogout();

  if (!isLoggingOut) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center pointer-events-auto">
      <div className="flex flex-col items-center gap-4">
        <SushiLoader />
        <p className="text-white text-lg font-medium">Cerrando sesión...</p>
      </div>
    </div>
  );
}
