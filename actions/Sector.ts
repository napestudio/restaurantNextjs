"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const sectorSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
  branchId: z.string().min(1, "La sucursal es requerida"),
  order: z.number().optional(),
  width: z.number().min(400).max(5000).optional(),
  height: z.number().min(400).max(5000).optional(),
});

export async function createSector(data: z.infer<typeof sectorSchema>) {
  try {
    const validatedData = sectorSchema.parse(data);

    // Check if sector name already exists in this branch
    const existingSector = await prisma.sector.findUnique({
      where: {
        branchId_name: {
          branchId: validatedData.branchId,
          name: validatedData.name,
        },
      },
    });

    if (existingSector) {
      return {
        success: false,
        error: "Ya existe un sector con ese nombre en esta sucursal",
      };
    }

    // Get the highest order value to place new sector at the end
    const maxOrder = await prisma.sector.findFirst({
      where: { branchId: validatedData.branchId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const sector = await prisma.sector.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
        branchId: validatedData.branchId,
        order: validatedData.order ?? (maxOrder?.order ?? 0) + 1,
        width: validatedData.width ?? 1200,
        height: validatedData.height ?? 800,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
      data: sector,
    };
  } catch (error) {
    console.error("Error creating sector:", error);
    return {
      success: false,
      error: "Error al crear el sector",
    };
  }
}

export async function getSectorsByBranch(branchId: string) {
  try {
    const sectors = await prisma.sector.findMany({
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
            tables: true,
          },
        },
      },
    });

    return {
      success: true,
      data: sectors,
    };
  } catch (error) {
    console.error("Error fetching sectors:", error);
    return {
      success: false,
      error: "Error al obtener los sectores",
      data: [],
    };
  }
}

export async function updateSector(
  id: string,
  data: Partial<z.infer<typeof sectorSchema>>
) {
  try {
    const sector = await prisma.sector.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.color && { color: data.color }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.width !== undefined && { width: data.width }),
        ...(data.height !== undefined && { height: data.height }),
      },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
      data: sector,
    };
  } catch (error) {
    console.error("Error updating sector:", error);
    return {
      success: false,
      error: "Error al actualizar el sector",
    };
  }
}

export async function deleteSector(id: string) {
  try {
    // Check if sector has tables
    const sector = await prisma.sector.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tables: true,
          },
        },
      },
    });

    if (!sector) {
      return {
        success: false,
        error: "Sector no encontrado",
      };
    }

    if (sector._count.tables > 0) {
      return {
        success: false,
        error: "No se puede eliminar un sector que tiene mesas asignadas",
      };
    }

    await prisma.sector.delete({
      where: { id },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting sector:", error);
    return {
      success: false,
      error: "Error al eliminar el sector",
    };
  }
}
