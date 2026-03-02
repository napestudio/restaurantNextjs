"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import type { DeliveryWindowInput } from "@/types/delivery";
export type { DeliveryWindowInput };

type SerializedDeliveryWindow = {
  id: string;
  name: string;
  startTime: string;
  deliveryStartTime: string;
  endTime: string;
  daysOfWeek: string[];
  maxOrders: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SerializedDeliveryConfig = {
  id: string;
  branchId: string;
  menuId: string | null;
  isActive: boolean;
  minOrderAmount: number;
  deliveryFee: number;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
  menu?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  deliveryWindows: SerializedDeliveryWindow[];
};

/**
 * Get delivery configuration for a branch
 */
export async function getDeliveryConfig(branchId: string): Promise<{
  success: boolean;
  data?: SerializedDeliveryConfig | null;
  error?: string;
}> {
  try {
    const config = await prisma.deliveryConfig.findUnique({
      where: { branchId },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        deliveryWindows: {
          where: { isActive: true },
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!config) {
      return {
        success: true,
        data: null, // No config yet, will create on first save
      };
    }

    // Serialize Decimal and Date fields - following pattern from menus.ts
    return {
      success: true,
      data: {
        id: config.id,
        branchId: config.branchId,
        menuId: config.menuId,
        isActive: config.isActive,
        minOrderAmount: config.minOrderAmount ? Number(config.minOrderAmount) : 0,
        deliveryFee: config.deliveryFee ? Number(config.deliveryFee) : 0,
        estimatedMinutes: config.estimatedMinutes ?? 45,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
        menu: config.menu,
        deliveryWindows: config.deliveryWindows.map((w) => ({
          id: w.id,
          name: w.name,
          startTime: w.startTime.toISOString(),
          deliveryStartTime: w.deliveryStartTime.toISOString(),
          endTime: w.endTime.toISOString(),
          daysOfWeek: w.daysOfWeek,
          maxOrders: w.maxOrders,
          isActive: w.isActive,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("Error getting delivery config:", error);
    return {
      success: false,
      error: "Error al obtener configuración de delivery",
    };
  }
}

/**
 * Update or create delivery configuration
 */
export async function updateDeliveryConfig(data: {
  branchId: string;
  menuId: string | null;
  isActive: boolean;
  minOrderAmount?: number;
  deliveryFee?: number;
  estimatedMinutes?: number;
  windows: DeliveryWindowInput[];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await prisma.$transaction(async (tx) => {
      // Upsert delivery config
      const config = await tx.deliveryConfig.upsert({
        where: { branchId: data.branchId },
        create: {
          branchId: data.branchId,
          menuId: data.menuId,
          isActive: data.isActive,
          minOrderAmount: data.minOrderAmount ?? 0,
          deliveryFee: data.deliveryFee ?? 0,
          estimatedMinutes: data.estimatedMinutes ?? 45,
        },
        update: {
          menuId: data.menuId,
          isActive: data.isActive,
          minOrderAmount: data.minOrderAmount ?? 0,
          deliveryFee: data.deliveryFee ?? 0,
          estimatedMinutes: data.estimatedMinutes ?? 45,
        },
      });

      // Delete existing windows and recreate
      await tx.deliveryWindow.deleteMany({
        where: { deliveryConfigId: config.id },
      });

      if (data.windows.length > 0) {
        await tx.deliveryWindow.createMany({
          data: data.windows.map((w) => ({
            deliveryConfigId: config.id,
            name: w.name,
            startTime: new Date(`1970-01-01T${w.startTime}:00.000Z`),
            deliveryStartTime: new Date(`1970-01-01T${w.deliveryStartTime}:00.000Z`),
            endTime: new Date(`1970-01-01T${w.endTime}:00.000Z`),
            daysOfWeek: w.daysOfWeek,
            maxOrders: w.maxOrders ?? 10,
            isActive: w.isActive ?? true,
          })),
        });
      }
    });

    revalidatePath("/dashboard/config/delivery");
    revalidatePath("/pedidos");
    return { success: true };
  } catch (error) {
    console.error("Error updating delivery config:", error);
    return {
      success: false,
      error: "Error al actualizar configuración de delivery",
    };
  }
}

/**
 * Get available delivery windows for a specific date
 */
export async function getAvailableDeliveryWindows(
  branchId: string,
  dateString: string, // YYYY-MM-DD format
): Promise<{
  success: boolean;
  data?: SerializedDeliveryWindow[];
  error?: string;
}> {
  try {
    // Parse date to get day of week
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][date.getDay()];

    const config = await prisma.deliveryConfig.findUnique({
      where: { branchId },
      include: {
        deliveryWindows: {
          where: {
            isActive: true,
            daysOfWeek: {
              has: dayOfWeek,
            },
          },
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!config || !config.isActive) {
      return {
        success: true,
        data: [],
      };
    }

    const serialized = config.deliveryWindows.map((w) => ({
      ...w,
      startTime: w.startTime.toISOString(),
      deliveryStartTime: w.deliveryStartTime.toISOString(),
      endTime: w.endTime.toISOString(),
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: serialized,
    };
  } catch (error) {
    console.error("Error getting available delivery windows:", error);
    return { success: false, error: "Error al obtener horarios de delivery" };
  }
}

/**
 * Check if delivery is available at a specific date/time
 */
export async function isDeliveryAvailable(
  branchId: string,
  requestedTime: Date,
): Promise<{
  available: boolean;
  reason?: string;
  window?: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    daysOfWeek: string[];
    maxOrders: number;
    isActive: boolean;
  };
}> {
  try {
    const config = await prisma.deliveryConfig.findUnique({
      where: { branchId },
      include: { deliveryWindows: { where: { isActive: true } } },
    });

    if (!config || !config.isActive) {
      return {
        available: false,
        reason: "El servicio de delivery no está activo",
      };
    }

    // Convert current time to restaurant's local timezone (Argentina).
    // Times are stored as UTC values equal to what the admin entered (e.g. "22:00" UTC
    // means the admin typed "22:00"), so we compare against the local clock reading.
    const TZ = "America/Argentina/Buenos_Aires";
    const localDate = new Date(
      requestedTime.toLocaleString("en-US", { timeZone: TZ }),
    );
    const dayOfWeek = localDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const hh = String(localDate.getHours()).padStart(2, "0");
    const mm = String(localDate.getMinutes()).padStart(2, "0");
    const timeString = `${hh}:${mm}`;

    const matchingWindow = config.deliveryWindows.find((window) => {
      if (!window.daysOfWeek.includes(dayOfWeek)) return false;

      // Extract the "as-entered" HH:mm from the stored UTC DateTime
      const start = window.startTime.toISOString().slice(11, 16);
      const end = window.endTime.toISOString().slice(11, 16);

      return timeString >= start && timeString <= end;
    });

    if (!matchingWindow) {
      return {
        available: false,
        reason: "No hay horario de delivery disponible en este momento",
      };
    }

    return { available: true, window: matchingWindow };
  } catch (error) {
    console.error("Error checking delivery availability:", error);
    return { available: false, reason: "Error al verificar disponibilidad" };
  }
}

/**
 * Get all menus for a branch (for dropdown selection)
 */
export async function getMenusForBranch(branchId: string): Promise<{
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

    return {
      success: true,
      data: menus,
    };
  } catch (error) {
    console.error("Error getting menus:", error);
    return { success: false, error: "Error al obtener menús" };
  }
}
