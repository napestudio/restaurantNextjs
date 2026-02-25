"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getBranch(branchId: string) {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    return { success: true, data: branch };
  } catch (error) {
    console.error("Error fetching branch:", error);
    return { success: false, error: "Error al obtener la sucursal" };
  }
}

export async function updateBranch(
  branchId: string,
  data: { notificationEmail?: string }
) {
  try {
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(data.notificationEmail !== undefined && {
          notificationEmail: data.notificationEmail || null,
        }),
      },
    });

    revalidatePath("/dashboard/config/slots");

    return { success: true, data: branch };
  } catch (error) {
    console.error("Error updating branch:", error);
    return { success: false, error: "Error al actualizar la sucursal" };
  }
}
