"use client";

import ConfigSideBar from "@/components/dashboard/config-side-bar";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function ConfigLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 w-full flex pt-11">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed left-4 top-14 z-30 bg-red-500 text-white p-2 rounded-lg shadow-lg hover:bg-red-600 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <ConfigSideBar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="mx-auto w-full lg:ml-0">{children}</main>
    </div>
  );
}
