import { hasBranchPrinters } from "@/actions/PrinterActions";
import { getBranch } from "@/actions/Branch";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ConditionalGgEzPrintProvider } from "@/components/providers/conditional-gg-ez-print-provider";
import { auth } from "@/lib/auth";
import { getNavItems } from "@/lib/dashboard-nav";
import { getUserRole } from "@/lib/permissions/roles";
import { getCurrentUserBranchId } from "@/lib/user-branch";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Kiku Sushi - Panel de Administración",
  description:
    "Panel de administración para gestionar el restaurante Kiku Sushi.",
  // manifest: "/manifest.json",
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

  // Get user's role and branch in parallel
  const [userRole, branchId] = await Promise.all([
    getUserRole(session.user.id),
    getCurrentUserBranchId(),
  ]);

  // Get filtered nav items on server (includes grant-based overrides)
  const navItems = await getNavItems(userRole, session.user.id, branchId ?? "");

  // Check if branch has printers and get printer server URL (for conditional loading of gg-ez-print)
  const [hasPrinters, branchResult] = await Promise.all([
    branchId ? hasBranchPrinters(branchId) : Promise.resolve(false),
    branchId ? getBranch(branchId) : Promise.resolve({ success: false, data: null }),
  ]);
  const printerServerUrl =
    branchResult.success && branchResult.data?.printerServerUrl
      ? branchResult.data.printerServerUrl
      : undefined;

  return (
    <ConditionalGgEzPrintProvider hasPrinters={hasPrinters} wsUrl={printerServerUrl}>
      <div className="min-h-svh bg-gray-50 w-full">
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
