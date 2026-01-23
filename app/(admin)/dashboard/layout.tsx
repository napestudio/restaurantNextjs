import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Metadata } from "next";
import { getUserRole } from "@/lib/permissions/roles";
import { getNavItems } from "@/lib/dashboard-nav";
import { ConditionalGgEzPrintProvider } from "@/components/providers/conditional-gg-ez-print-provider";
import { getCurrentUserBranchId } from "@/lib/user-branch";
import { hasBranchPrinters } from "@/actions/PrinterActions";

export const metadata: Metadata = {
  title: "Kiku Sushi - Panel de Administración",
  description:
    "Panel de administración para gestionar el restaurante Kiku Sushi.",
  // manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Restaurant",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-152x152.png", sizes: "152x152", type: "image/png" }],
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single auth check - middleware already verified authentication
  // This check is kept for type safety and to get user data for the nav
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Get user's role to pass to nav
  const userRole = await getUserRole(session.user.id);

  // Get filtered nav items on server
  const navItems = getNavItems(userRole);

  // Check if branch has printers (for conditional loading of gg-ez-print)
  const branchId = await getCurrentUserBranchId();
  const hasPrinters = branchId ? await hasBranchPrinters(branchId) : false;

  return (
    <ConditionalGgEzPrintProvider hasPrinters={hasPrinters}>
      <div className="min-h-screen bg-gray-50 w-full">
        <DashboardNav
          userName={session.user.name || session.user.email || ""}
          userRole={userRole}
          navItems={navItems}
        />
        <main className="mx-auto">{children}</main>
      </div>
    </ConditionalGgEzPrintProvider>
  );
}
