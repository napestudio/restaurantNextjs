"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { HomePageLinkType } from "@/app/generated/prisma";

import type { SerializedHomePageLink } from "@/types/home-page";
export type { SerializedHomePageLink };

/**
 * Get all home page links for a branch
 */
export async function getHomePageLinks(branchId: string): Promise<{
  success: boolean;
  data?: SerializedHomePageLink[];
  error?: string;
}> {
  try {
    const links = await prisma.homePageLink.findMany({
      where: { branchId },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: links.map((link) => ({
        id: link.id,
        branchId: link.branchId,
        type: link.type,
        label: link.label,
        order: link.order,
        isActive: link.isActive,
        menuId: link.menuId,
        timeSlotId: link.timeSlotId,
        customUrl: link.customUrl,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
        menu: link.menu,
        timeSlot: link.timeSlot,
      })),
    };
  } catch (error) {
    console.error("Error getting home page links:", error);
    return {
      success: false,
      error: "Error al obtener enlaces de página principal",
    };
  }
}

/**
 * Get active home page links for public display
 */
export async function getActiveHomePageLinks(branchId: string): Promise<{
  success: boolean;
  data?: SerializedHomePageLink[];
  error?: string;
}> {
  try {
    const links = await prisma.homePageLink.findMany({
      where: {
        branchId,
        isActive: true,
      },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: links.map((link) => ({
        id: link.id,
        branchId: link.branchId,
        type: link.type,
        label: link.label,
        order: link.order,
        isActive: link.isActive,
        menuId: link.menuId,
        timeSlotId: link.timeSlotId,
        customUrl: link.customUrl,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
        menu: link.menu,
        timeSlot: link.timeSlot,
      })),
    };
  } catch (error) {
    console.error("Error getting active home page links:", error);
    return {
      success: false,
      error: "Error al obtener enlaces activos",
    };
  }
}

/**
 * Create a new home page link
 */
export async function createHomePageLink(data: {
  branchId: string;
  type: HomePageLinkType;
  label: string;
  menuId?: string | null;
  timeSlotId?: string | null;
  customUrl?: string | null;
  isActive?: boolean;
}): Promise<{
  success: boolean;
  data?: SerializedHomePageLink;
  error?: string;
}> {
  try {
    // Validation
    if (data.type === "MENU" && !data.menuId) {
      return { success: false, error: "Menu ID es requerido para tipo MENU" };
    }
    if (data.type === "TIMESLOT" && !data.timeSlotId) {
      return { success: false, error: "TimeSlot ID es requerido para tipo TIMESLOT" };
    }
    if (data.type === "CUSTOM" && !data.customUrl) {
      return { success: false, error: "URL personalizada es requerida para tipo CUSTOM" };
    }

    // Get the current max order for this branch
    const maxOrderLink = await prisma.homePageLink.findFirst({
      where: { branchId: data.branchId },
      orderBy: { order: "desc" },
    });

    const newOrder = (maxOrderLink?.order ?? -1) + 1;

    const link = await prisma.homePageLink.create({
      data: {
        branchId: data.branchId,
        type: data.type,
        label: data.label,
        menuId: data.menuId,
        timeSlotId: data.timeSlotId,
        customUrl: data.customUrl,
        isActive: data.isActive ?? true,
        order: newOrder,
      },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/config/homepage");

    return {
      success: true,
      data: {
        id: link.id,
        branchId: link.branchId,
        type: link.type,
        label: link.label,
        order: link.order,
        isActive: link.isActive,
        menuId: link.menuId,
        timeSlotId: link.timeSlotId,
        customUrl: link.customUrl,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
        menu: link.menu,
        timeSlot: link.timeSlot,
      },
    };
  } catch (error) {
    console.error("Error creating home page link:", error);
    return {
      success: false,
      error: "Error al crear enlace",
    };
  }
}

/**
 * Update an existing home page link
 */
export async function updateHomePageLink(
  id: string,
  data: {
    type?: HomePageLinkType;
    label?: string;
    menuId?: string | null;
    timeSlotId?: string | null;
    customUrl?: string | null;
    isActive?: boolean;
  }
): Promise<{
  success: boolean;
  data?: SerializedHomePageLink;
  error?: string;
}> {
  try {
    const link = await prisma.homePageLink.update({
      where: { id },
      data: {
        type: data.type,
        label: data.label,
        menuId: data.menuId,
        timeSlotId: data.timeSlotId,
        customUrl: data.customUrl,
        isActive: data.isActive,
      },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/config/homepage");

    return {
      success: true,
      data: {
        id: link.id,
        branchId: link.branchId,
        type: link.type,
        label: link.label,
        order: link.order,
        isActive: link.isActive,
        menuId: link.menuId,
        timeSlotId: link.timeSlotId,
        customUrl: link.customUrl,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
        menu: link.menu,
        timeSlot: link.timeSlot,
      },
    };
  } catch (error) {
    console.error("Error updating home page link:", error);
    return {
      success: false,
      error: "Error al actualizar enlace",
    };
  }
}

/**
 * Delete a home page link
 */
export async function deleteHomePageLink(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await prisma.homePageLink.delete({
      where: { id },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/config/homepage");

    return { success: true };
  } catch (error) {
    console.error("Error deleting home page link:", error);
    return {
      success: false,
      error: "Error al eliminar enlace",
    };
  }
}

/**
 * Reorder home page links
 */
export async function reorderHomePageLinks(
  branchId: string,
  linkIds: string[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await prisma.$transaction(
      linkIds.map((id, index) =>
        prisma.homePageLink.update({
          where: { id, branchId }, // Ensure link belongs to this branch
          data: { order: index },
        })
      )
    );

    revalidatePath("/");
    revalidatePath("/dashboard/config/homepage");

    return { success: true };
  } catch (error) {
    console.error("Error reordering links:", error);
    return {
      success: false,
      error: "Error al reordenar enlaces",
    };
  }
}

/**
 * Toggle link active status
 */
export async function toggleHomePageLinkStatus(id: string): Promise<{
  success: boolean;
  data?: SerializedHomePageLink;
  error?: string;
}> {
  try {
    const currentLink = await prisma.homePageLink.findUnique({
      where: { id },
    });

    if (!currentLink) {
      return { success: false, error: "Enlace no encontrado" };
    }

    const link = await prisma.homePageLink.update({
      where: { id },
      data: { isActive: !currentLink.isActive },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/config/homepage");

    return {
      success: true,
      data: {
        id: link.id,
        branchId: link.branchId,
        type: link.type,
        label: link.label,
        order: link.order,
        isActive: link.isActive,
        menuId: link.menuId,
        timeSlotId: link.timeSlotId,
        customUrl: link.customUrl,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
        menu: link.menu,
        timeSlot: link.timeSlot,
      },
    };
  } catch (error) {
    console.error("Error toggling link status:", error);
    return {
      success: false,
      error: "Error al cambiar estado del enlace",
    };
  }
}

/**
 * Get available menus for link creation
 */
export async function getAvailableMenus(branchId: string): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string; slug: string }>;
  error?: string;
}> {
  try {
    const menus = await prisma.menu.findMany({
      where: {
        branchId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, data: menus };
  } catch (error) {
    console.error("Error getting available menus:", error);
    return { success: false, error: "Error al obtener menús" };
  }
}

/**
 * Get available time slots for link creation
 */
export async function getAvailableTimeSlots(branchId: string): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        branchId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return { success: true, data: timeSlots };
  } catch (error) {
    console.error("Error getting available time slots:", error);
    return { success: false, error: "Error al obtener horarios" };
  }
}
