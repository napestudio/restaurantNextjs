"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashBoardNavItems({
  navItems,
}: {
  navItems: { label: string; href: string }[];
}) {
  const currentPath = usePathname();

  return (
    <div className="hidden sm:flex">
      {navItems.map((item) => {
        const isActive = currentPath === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-opacity ${
              isActive
                ? "font-bold text-neutral-100 bg-red-500"
                : "text-neutral-800 hover:text-red-500"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
