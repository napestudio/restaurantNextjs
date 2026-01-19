import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Metadata } from "next";
import { isUserAdmin } from "@/lib/permissions";
import { GgEzPrintProvider } from "@/contexts/gg-ez-print-context";
import { getCurrentUserBranchId } from "@/lib/user-branch";
import { hasBranchPrinters } from "@/actions/PrinterQz";

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

  // Pre-fetch admin status to pass to nav (avoids redundant auth calls)
  const hasAdminRole = await isUserAdmin(session.user.id);

  // Get user's branch and check if they have printers
  const branchId = await getCurrentUserBranchId();
  const shouldLoadGgEzPrint = branchId ? await hasBranchPrinters(branchId) : false;

  if (shouldLoadGgEzPrint) {
    return (
      <GgEzPrintProvider>
        <div className="min-h-screen bg-gray-50 w-full">
          <DashboardNav
            userName={session.user.name || session.user.email || ""}
            hasAdminRole={hasAdminRole}
          />
          <main className="mx-auto">{children}</main>
        </div>
      </GgEzPrintProvider>
    );
  }

  // No printers - render without gg-ez-print
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <DashboardNav
        userName={session.user.name || session.user.email || ""}
        hasAdminRole={hasAdminRole}
      />
      <main className="mx-auto">{children}</main>
    </div>
  );
}
