"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const sectionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
  branchId: z.string().min(1, "La sucursal es requerida"),
  order: z.number().optional(),
});

export async function createSection(data: z.infer<typeof sectionSchema>) {
  try {
    const validatedData = sectionSchema.parse(data);

    // Check if section name already exists in this branch
    const existingSection = await prisma.section.findUnique({
      where: {
        branchId_name: {
          branchId: validatedData.branchId,
          name: validatedData.name,
        },
      },
    });

    if (existingSection) {
      return {
        success: false,
        error: "Ya existe una sección con ese nombre en esta sucursal",
      };
    }

    // Get the highest order value to place new section at the end
    const maxOrder = await prisma.section.findFirst({
      where: { branchId: validatedData.branchId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const section = await prisma.section.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
        branchId: validatedData.branchId,
        order: validatedData.order ?? (maxOrder?.order ?? 0) + 1,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
      data: section,
    };
  } catch (error) {
    console.error("Error creating section:", error);
    return {
      success: false,
      error: "Error al crear la sección",
    };
  }
}

export async function getSectionsByBranch(branchId: string) {
  try {
    const sections = await prisma.section.findMany({
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
      data: sections,
    };
  } catch (error) {
    console.error("Error fetching sections:", error);
    return {
      success: false,
      error: "Error al obtener las secciones",
      data: [],
    };
  }
}

export async function updateSection(
  id: string,
  data: Partial<z.infer<typeof sectionSchema>>
) {
  try {
    const section = await prisma.section.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.color && { color: data.color }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
      data: section,
    };
  } catch (error) {
    console.error("Error updating section:", error);
    return {
      success: false,
      error: "Error al actualizar la sección",
    };
  }
}

export async function deleteSection(id: string) {
  try {
    // Check if section has tables
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tables: true,
          },
        },
      },
    });

    if (!section) {
      return {
        success: false,
        error: "Sección no encontrada",
      };
    }

    if (section._count.tables > 0) {
      return {
        success: false,
        error: "No se puede eliminar una sección que tiene mesas asignadas",
      };
    }

    await prisma.section.delete({
      where: { id },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting section:", error);
    return {
      success: false,
      error: "Error al eliminar la sección",
    };
  }
}
