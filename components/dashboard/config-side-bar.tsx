"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const CONFIG_ITEMS = [
  {
    label: "Restaurant",
    href: "/dashboard/config/restaurant",
  },
  {
    label: "Turnos",
    href: "/dashboard/config/slots",
  },
  {
    label: "Usuarios",
    href: "/dashboard/config/users",
  },
  {
    label: "Clientes",
    href: "/dashboard/config/clients",
  },
  {
    label: "Impresoras",
    href: "/dashboard/config/printers",
  },
  {
    label: "Mesas",
    href: "/dashboard/config/tables",
  },
  {
    label: "Cajas",
    href: "/dashboard/config/cash-registers",
  },
];

interface ConfigSideBarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ConfigSideBar({ isOpen = true, onClose }: ConfigSideBarProps) {
  const currentPath = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:sticky left-0 top-0 lg:top-11 h-screen lg:h-[calc(100svh-44px)] bg-red-500 z-50 lg:z-0 transition-transform duration-300 ease-in-out",
        "w-64 lg:w-64",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Close button - mobile only */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 rounded-lg p-2"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex flex-col p-4 space-y-1">
          {CONFIG_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "block px-4 py-2 rounded text-xl hover:bg-white hover:text-red-500 text-white font-medium",
                currentPath === item.href ? "bg-white text-red-500 font-bold" : ""
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
