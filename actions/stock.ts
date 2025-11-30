"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma";

export type AdjustStockInput = {
  productOnBranchId: string;
  quantity: number; // Positivo = entrada, Negativo = salida
  reason: string;
  notes?: string;
  reference?: string;
  createdBy?: string;
};

export type StockMovementFilter = {
  productOnBranchId?: string;
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
};

/**
 * Ajusta el stock de un producto en una sucursal
 * Registra el movimiento en el historial
 */
export async function adjustStock(input: AdjustStockInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Obtener el ProductOnBranch actual
      const productOnBranch = await tx.productOnBranch.findUnique({
        where: { id: input.productOnBranchId },
        include: {
          product: true,
          branch: true,
        },
      });

      if (!productOnBranch) {
        throw new Error("Producto no encontrado en la sucursal");
      }

      // Validar que el producto tenga seguimiento de stock habilitado
      if (!productOnBranch.product.trackStock) {
        throw new Error("Este producto no tiene seguimiento de stock habilitado");
      }

      const previousStock = Number(productOnBranch.stock);
      const newStock = previousStock + input.quantity;

      // Validar que el stock no sea negativo
      if (newStock < 0) {
        throw new Error("El stock no puede ser negativo");
      }

      // Actualizar el stock
      const updatedProductOnBranch = await tx.productOnBranch.update({
        where: { id: input.productOnBranchId },
        data: {
          stock: newStock,
          lastRestocked: input.quantity > 0 ? new Date() : productOnBranch.lastRestocked,
        },
      });

      // Registrar el movimiento
      const stockMovement = await tx.stockMovement.create({
        data: {
          productOnBranchId: input.productOnBranchId,
          quantity: input.quantity,
          previousStock,
          newStock,
          reason: input.reason,
          notes: input.notes,
          reference: input.reference,
          createdBy: input.createdBy,
        },
      });

      return { updatedProductOnBranch, stockMovement };
    });

    // Serialize Decimal and Date fields
    const serializedResult = {
      updatedProductOnBranch: {
        ...result.updatedProductOnBranch,
        stock: Number(result.updatedProductOnBranch.stock),
        minStock: result.updatedProductOnBranch.minStock ? Number(result.updatedProductOnBranch.minStock) : null,
        maxStock: result.updatedProductOnBranch.maxStock ? Number(result.updatedProductOnBranch.maxStock) : null,
        lastRestocked: result.updatedProductOnBranch.lastRestocked
          ? result.updatedProductOnBranch.lastRestocked.toISOString()
          : null,
        createdAt: result.updatedProductOnBranch.createdAt.toISOString(),
        updatedAt: result.updatedProductOnBranch.updatedAt.toISOString(),
      },
      stockMovement: {
        ...result.stockMovement,
        quantity: Number(result.stockMovement.quantity),
        previousStock: Number(result.stockMovement.previousStock),
        newStock: Number(result.stockMovement.newStock),
        createdAt: result.stockMovement.createdAt.toISOString(),
      },
    };

    revalidatePath("/dashboard/menu-items");
    revalidatePath("/dashboard/stock");
    return { success: true, data: serializedResult };
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al ajustar el stock"
    };
  }
}

/**
 * Registra múltiples ajustes de stock en una sola transacción
 */
export async function bulkAdjustStock(adjustments: AdjustStockInput[]) {
  try {
    const results = await prisma.$transaction(async (tx) => {
      const txResults = [];
      for (const adjustment of adjustments) {
        const result = await adjustStock(adjustment);
        if (!result.success) {
          throw new Error(result.error);
        }
        txResults.push(result.data);
      }
      return txResults;
    });

    revalidatePath("/dashboard/menu-items");
    revalidatePath("/dashboard/stock");
    return { success: true, data: results };
  } catch (error) {
    console.error("Error in bulk stock adjustment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al ajustar el stock masivo"
    };
  }
}

/**
 * Obtiene el historial de movimientos de stock
 */
export async function getStockMovements(filter: StockMovementFilter = {}) {
  try {
    const where: Prisma.StockMovementWhereInput = {};

    if (filter.productOnBranchId) {
      where.productOnBranchId = filter.productOnBranchId;
    }

    if (filter.branchId) {
      where.productOnBranch = {
        branchId: filter.branchId,
      };
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    if (filter.reason) {
      where.reason = { contains: filter.reason, mode: "insensitive" };
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        productOnBranch: {
          include: {
            product: true,
            branch: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limitar a los últimos 100 movimientos
    });

    return { success: true, data: movements };
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener el historial de stock"
    };
  }
}

/**
 * Obtiene el resumen de stock de una sucursal
 */
export async function getBranchStockSummary(branchId: string) {
  try {
    const productsOnBranch = await prisma.productOnBranch.findMany({
      where: {
        branchId,
        isActive: true,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        prices: true,
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    // Calcular estadísticas (solo para productos con trackStock = true)
    const totalProducts = productsOnBranch.length;
    const lowStockProducts = productsOnBranch.filter(pob => {
      // Ignorar productos sin seguimiento de stock
      if (!pob.product.trackStock) return false;
      const minAlert = pob.product.minStockAlert;
      if (!minAlert) return false;
      return Number(pob.stock) < Number(minAlert);
    });

    const outOfStockProducts = productsOnBranch.filter(pob => {
      // Ignorar productos sin seguimiento de stock
      if (!pob.product.trackStock) return false;
      return Number(pob.stock) === 0;
    });

    const totalStockValue = productsOnBranch.reduce((sum, pob) => {
      // Solo calcular valor de productos con seguimiento de stock
      if (!pob.product.trackStock) return sum;
      // Usar precio de comida en local (DINE_IN) para el cálculo del valor
      const dineInPrice = pob.prices.find(p => p.type === "DINE_IN");
      if (!dineInPrice) return sum;
      return sum + Number(pob.stock) * Number(dineInPrice.price);
    }, 0);

    // Serialize Decimal and Date fields
    const serializedProducts = productsOnBranch.map((pob) => ({
      ...pob,
      stock: Number(pob.stock),
      minStock: pob.minStock ? Number(pob.minStock) : null,
      maxStock: pob.maxStock ? Number(pob.maxStock) : null,
      lastRestocked: pob.lastRestocked ? pob.lastRestocked.toISOString() : null,
      createdAt: pob.createdAt.toISOString(),
      updatedAt: pob.updatedAt.toISOString(),
      product: {
        ...pob.product,
        minStockAlert: pob.product.minStockAlert ? Number(pob.product.minStockAlert) : null,
        createdAt: pob.product.createdAt.toISOString(),
        updatedAt: pob.product.updatedAt.toISOString(),
      },
      prices: pob.prices.map((price) => ({
        ...price,
        price: Number(price.price),
      })),
    }));

    return {
      success: true,
      data: {
        products: serializedProducts,
        stats: {
          totalProducts,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
          totalStockValue,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching branch stock summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener el resumen de stock"
    };
  }
}

/**
 * Establece el stock de un producto en una sucursal (sin historial)
 * Útil para establecer stock inicial
 */
export async function setInitialStock(
  productOnBranchId: string,
  stock: number,
  createdBy?: string
) {
  try {
    const productOnBranch = await prisma.productOnBranch.findUnique({
      where: { id: productOnBranchId },
    });

    if (!productOnBranch) {
      throw new Error("Producto no encontrado en la sucursal");
    }

    const previousStock = Number(productOnBranch.stock);

    // Actualizar stock y registrar el movimiento
    const result = await adjustStock({
      productOnBranchId,
      quantity: stock - previousStock,
      reason: "Stock inicial",
      notes: "Establecimiento de stock inicial",
      createdBy,
    });

    return result;
  } catch (error) {
    console.error("Error setting initial stock:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al establecer el stock inicial"
    };
  }
}

/**
 * Obtiene productos con bajo stock en una sucursal
 */
export async function getLowStockAlerts(branchId: string) {
  try {
    const lowStockProducts = await prisma.productOnBranch.findMany({
      where: {
        branchId,
        isActive: true,
        product: {
          minStockAlert: { not: null },
          trackStock: true, // Solo productos con seguimiento de stock
          isActive: true,
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        prices: true,
      },
    });

    // Filtrar donde stock actual < alerta mínima
    const alerts = lowStockProducts.filter(pob => {
      const minAlert = pob.product.minStockAlert;
      if (!minAlert) return false;
      return Number(pob.stock) < Number(minAlert);
    });

    // Ordenar por urgencia (menor stock primero)
    alerts.sort((a, b) => {
      const aRatio = Number(a.stock) / Number(a.product.minStockAlert ?? 1);
      const bRatio = Number(b.stock) / Number(b.product.minStockAlert ?? 1);
      return aRatio - bRatio;
    });

    // Serialize Decimal and Date fields
    const serializedAlerts = alerts.map((alert) => ({
      ...alert,
      stock: Number(alert.stock),
      minStock: alert.minStock ? Number(alert.minStock) : null,
      maxStock: alert.maxStock ? Number(alert.maxStock) : null,
      lastRestocked: alert.lastRestocked ? alert.lastRestocked.toISOString() : null,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
      product: {
        ...alert.product,
        minStockAlert: alert.product.minStockAlert ? Number(alert.product.minStockAlert) : null,
        createdAt: alert.product.createdAt.toISOString(),
        updatedAt: alert.product.updatedAt.toISOString(),
      },
      prices: alert.prices.map((price) => ({
        ...price,
        price: Number(price.price),
      })),
    }));

    return { success: true, data: serializedAlerts };
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener alertas de stock bajo"
    };
  }
}
