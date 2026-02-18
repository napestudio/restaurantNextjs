import type { HomePageLinkType } from "@/app/generated/prisma";

export type SerializedHomePageLink = {
  id: string;
  branchId: string;
  type: HomePageLinkType;
  label: string;
  order: number;
  isActive: boolean;
  menuId: string | null;
  timeSlotId: string | null;
  customUrl: string | null;
  createdAt: string;
  updatedAt: string;

  // Related data for display
  menu?: { id: string; name: string; slug: string } | null;
  timeSlot?: { id: string; name: string } | null;
};
