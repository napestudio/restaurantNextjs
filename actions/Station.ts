"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const stationSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
  branchId: z.string().min(1, "La sucursal es requerida"),
  order: z.number().optional(),
});

export async function createStation(data: z.infer<typeof stationSchema>) {
  try {
    const validatedData = stationSchema.parse(data);

    // Check if station name already exists in this branch
    const existingStation = await prisma.station.findUnique({
      where: {
        branchId_name: {
          branchId: validatedData.branchId,
          name: validatedData.name,
        },
      },
    });

    if (existingStation) {
      return {
        success: false,
        error: "Ya existe una estación con ese nombre en esta sucursal",
      };
    }

    // Get the highest order value to place new station at the end
    const maxOrder = await prisma.station.findFirst({
      where: { branchId: validatedData.branchId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const station = await prisma.station.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color,
        branchId: validatedData.branchId,
        order: validatedData.order ?? (maxOrder?.order ?? 0) + 1,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      data: station,
    };
  } catch (error) {
    console.error("Error creating station:", error);
    return {
      success: false,
      error: "Error al crear la estación",
    };
  }
}

export async function getStationsByBranch(branchId: string) {
  try {
    const stations = await prisma.station.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: {
        order: "asc",
      },
      include: {
        _count: {
          select: {
            printers: true,
            stationCategories: true,
          },
        },
      },
    });

    return {
      success: true,
      data: stations,
    };
  } catch (error) {
    console.error("Error fetching stations:", error);
    return {
      success: false,
      error: "Error al obtener las estaciones",
      data: [],
    };
  }
}

export async function getStationById(id: string) {
  try {
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        printers: {
          select: {
            id: true,
            name: true,
            status: true,
            isActive: true,
          },
        },
        stationCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!station) {
      return {
        success: false,
        error: "Estación no encontrada",
      };
    }

    return {
      success: true,
      data: station,
    };
  } catch (error) {
    console.error("Error fetching station:", error);
    return {
      success: false,
      error: "Error al obtener la estación",
    };
  }
}

export async function updateStation(
  id: string,
  data: Partial<z.infer<typeof stationSchema>>
) {
  try {
    // If updating name, check it doesn't exist
    if (data.name) {
      const station = await prisma.station.findUnique({ where: { id } });
      if (!station) {
        return { success: false, error: "Estación no encontrada" };
      }

      const existingName = await prisma.station.findFirst({
        where: {
          branchId: station.branchId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existingName) {
        return {
          success: false,
          error: "Ya existe una estación con ese nombre en esta sucursal",
        };
      }
    }

    const station = await prisma.station.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.color && { color: data.color }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      data: station,
    };
  } catch (error) {
    console.error("Error updating station:", error);
    return {
      success: false,
      error: "Error al actualizar la estación",
    };
  }
}

export async function deleteStation(id: string) {
  try {
    // Check if station has printers or categories assigned
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            printers: true,
            stationCategories: true,
          },
        },
      },
    });

    if (!station) {
      return {
        success: false,
        error: "Estación no encontrada",
      };
    }

    if (station._count.printers > 0) {
      return {
        success: false,
        error:
          "No se puede eliminar una estación que tiene impresoras asignadas",
      };
    }

    // We can delete even if it has categories, they will be cascade deleted
    await prisma.station.delete({
      where: { id },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting station:", error);
    return {
      success: false,
      error: "Error al eliminar la estación",
    };
  }
}

export async function assignCategoriesToStation(
  stationId: string,
  categoryIds: string[]
) {
  try {
    // Delete existing assignments
    await prisma.stationCategory.deleteMany({
      where: { stationId },
    });

    // Create new assignments
    if (categoryIds.length > 0) {
      await prisma.stationCategory.createMany({
        data: categoryIds.map((categoryId) => ({
          stationId,
          categoryId,
        })),
      });
    }

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      message: "Categorías asignadas correctamente",
    };
  } catch (error) {
    console.error("Error assigning categories to station:", error);
    return {
      success: false,
      error: "Error al asignar categorías a la estación",
    };
  }
}

export async function getCategoriesByStation(stationId: string) {
  try {
    const stationCategories = await prisma.stationCategory.findMany({
      where: { stationId },
      include: {
        category: true,
      },
    });

    return {
      success: true,
      data: stationCategories.map((sc) => sc.category),
    };
  } catch (error) {
    console.error("Error fetching categories by station:", error);
    return {
      success: false,
      error: "Error al obtener las categorías de la estación",
      data: [],
    };
  }
}

export async function getStationWithDetails(stationId: string) {
  try {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        printers: {
          select: {
            id: true,
            name: true,
            status: true,
            isActive: true,
          },
        },
        stationCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        branch: {
          select: {
            restaurantId: true,
          },
        },
      },
    });

    if (!station) {
      return {
        success: false,
        error: "Estación no encontrada",
      };
    }

    return {
      success: true,
      data: station,
    };
  } catch (error) {
    console.error("Error fetching station with details:", error);
    return {
      success: false,
      error: "Error al obtener la estación",
    };
  }
}

export async function getCategoriesByRestaurant(restaurantId: string) {
  try {
    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: "Error al obtener las categorías",
      data: [],
    };
  }
}
