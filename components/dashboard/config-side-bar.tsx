"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CONFIG_ITEMS = [
  {
    label: "Usuarios",
    href: "/dashboard/config/users",
  },
  {
    label: "Impresoras",
    href: "/dashboard/config/printers",
  },
  {
    label: "Mesas",
    href: "/dashboard/config/tables",
  },
];

export default function ConfigSideBar() {
  const currentPath = usePathname();
  return (
    <div className="w-[300px] bg-red-500">
      <nav className="flex flex-col p-4 space-y-2">
        {CONFIG_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
  );
}
