"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashBoardNavItems({
  navItems,
}: {
  navItems: { label: string; href: string }[];
}) {
  const currentPath = usePathname();
  // console.log("Current Path:", currentPath, navItems[1].href);
  return (
    <div className="hidden sm:flex">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
            currentPath === item.href
              ? "font-bold text-neutral-100 bg-red-500"
              : "text-neutral-800 hover:text-red-500"
          }`}
          prefetch={true}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
