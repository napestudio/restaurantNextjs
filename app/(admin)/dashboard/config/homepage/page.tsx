import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";
import {
  getHomePageLinks,
  getAvailableMenus,
  getAvailableTimeSlots,
} from "@/actions/HomePageLinks";
import HomePageConfigClient from "./homepage-config-client";

export default async function HomePageConfigPage() {
  await requireRole(UserRole.ADMIN);

  const branchId = process.env.BRANCH_ID || "";

  if (!branchId) {
    return <p className="p-4 text-red-500">Error: Branch ID no configurado</p>;
  }

  // Fetch all necessary data
  const [linksResult, menusResult, timeSlotsResult] = await Promise.all([
    getHomePageLinks(branchId),
    getAvailableMenus(branchId),
    getAvailableTimeSlots(branchId),
  ]);

  const links = linksResult.success && linksResult.data ? linksResult.data : [];
  const menus = menusResult.success && menusResult.data ? menusResult.data : [];
  const timeSlots =
    timeSlotsResult.success && timeSlotsResult.data ? timeSlotsResult.data : [];

  return (
    <div className="bg-gray-50 w-full min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 py-16 w-full">
        <HomePageConfigClient
          branchId={branchId}
          initialLinks={links}
          availableMenus={menus}
          availableTimeSlots={timeSlots}
        />
      </div>
    </div>
  );
}
