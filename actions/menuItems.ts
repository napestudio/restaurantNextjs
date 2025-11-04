"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UnitType, WeightUnit, VolumeUnit, PriceType } from "@/app/generated/prisma";

export type CreateMenuItemInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  sku?: string;
  unitType: UnitType;
  weightUnit?: WeightUnit;
  volumeUnit?: VolumeUnit;
  minStockAlert?: number;
  trackStock?: boolean;
  categoryId?: string;
  restaurantId: string;
  isActive?: boolean;
};

export type UpdateMenuItemInput = {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  sku?: string;
  unitType?: UnitType;
  weightUnit?: WeightUnit;
  volumeUnit?: VolumeUnit;
  minStockAlert?: number;
  trackStock?: boolean;
  categoryId?: string;
  isActive?: boolean;
};

export type SetProductBranchInput = {
  productId: string;
  branchId: string;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  prices: {
    type: PriceType;
    price: number;
  }[];
};

/**
 * Crea un nuevo producto (menu item)
 */
export async function createMenuItem(input: CreateMenuItemInput) {
  try {
    const product = await prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        sku: input.sku,
        unitType: input.unitType,
        weightUnit: input.weightUnit,
        volumeUnit: input.volumeUnit,
        minStockAlert: input.minStockAlert,
        trackStock: input.trackStock ?? true,
        categoryId: input.categoryId,
        restaurantId: input.restaurantId,
        isActive: input.isActive ?? true,
      },
      include: {
        category: true,
      },
    });

    // Serialize Decimal and Date fields
    const serializedProduct = {
      ...product,
      minStockAlert: product.minStockAlert ? Number(product.minStockAlert) : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: serializedProduct };
  } catch (error) {
    console.error("Error creating menu item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear el producto"
    };
  }
}

/**
 * Actualiza un producto existente
 */
export async function updateMenuItem(input: UpdateMenuItemInput) {
  try {
    const product = await prisma.product.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        sku: input.sku,
        unitType: input.unitType,
        weightUnit: input.weightUnit,
        volumeUnit: input.volumeUnit,
        minStockAlert: input.minStockAlert,
        trackStock: input.trackStock,
        categoryId: input.categoryId,
        isActive: input.isActive,
      },
      include: {
        category: true,
      },
    });

    // Serialize Decimal and Date fields
    const serializedProduct = {
      ...product,
      minStockAlert: product.minStockAlert ? Number(product.minStockAlert) : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: serializedProduct };
  } catch (error) {
    console.error("Error updating menu item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar el producto"
    };
  }
}

/**
 * Elimina un producto (soft delete)
 */
export async function deleteMenuItem(id: string) {
  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/menu-items");
    return { success: true };
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el producto"
    };
  }
}

/**
 * Obtiene todos los productos de un restaurante
 */
export async function getMenuItems(restaurantId: string) {
  try {
    const products = await prisma.product.findMany({
      where: { restaurantId },
      include: {
        category: true,
        branches: {
          include: {
            branch: true,
            prices: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Serialize Decimal and Date fields for client components
    const serializedProducts = products.map((product) => ({
      ...product,
      minStockAlert: product.minStockAlert ? Number(product.minStockAlert) : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      branches: product.branches.map((branch) => ({
        ...branch,
        stock: Number(branch.stock),
        minStock: branch.minStock ? Number(branch.minStock) : null,
        maxStock: branch.maxStock ? Number(branch.maxStock) : null,
        lastRestocked: branch.lastRestocked
          ? branch.lastRestocked.toISOString()
          : null,
        createdAt: branch.createdAt.toISOString(),
        updatedAt: branch.updatedAt.toISOString(),
        prices: branch.prices.map((price) => ({
          ...price,
          price: Number(price.price),
        })),
      })),
    }));

    return { success: true, data: serializedProducts };
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener los productos"
    };
  }
}

/**
 * Obtiene un producto por ID
 */
export async function getMenuItem(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        branches: {
          include: {
            branch: true,
            prices: true,
          },
        },
      },
    });

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    return { success: true, data: product };
  } catch (error) {
    console.error("Error fetching menu item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener el producto"
    };
  }
}

/**
 * Configura un producto en una sucursal específica (stock y precios)
 */
export async function setProductOnBranch(input: SetProductBranchInput) {
  try {
    // Buscar o crear ProductOnBranch
    const existingProductOnBranch = await prisma.productOnBranch.findUnique({
      where: {
        productId_branchId: {
          productId: input.productId,
          branchId: input.branchId,
        },
      },
    });

    let productOnBranch;

    if (existingProductOnBranch) {
      // Actualizar existente
      productOnBranch = await prisma.productOnBranch.update({
        where: { id: existingProductOnBranch.id },
        data: {
          stock: input.stock ?? existingProductOnBranch.stock,
          minStock: input.minStock,
          maxStock: input.maxStock,
          isActive: input.isActive ?? existingProductOnBranch.isActive,
        },
      });
    } else {
      // Crear nuevo
      productOnBranch = await prisma.productOnBranch.create({
        data: {
          productId: input.productId,
          branchId: input.branchId,
          stock: input.stock ?? 0,
          minStock: input.minStock,
          maxStock: input.maxStock,
          isActive: input.isActive ?? true,
        },
      });
    }

    // Actualizar o crear precios
    for (const priceInput of input.prices) {
      await prisma.productPrice.upsert({
        where: {
          productOnBranchId_type: {
            productOnBranchId: productOnBranch.id,
            type: priceInput.type,
          },
        },
        create: {
          productOnBranchId: productOnBranch.id,
          type: priceInput.type,
          price: priceInput.price,
        },
        update: {
          price: priceInput.price,
        },
      });
    }

    // Serialize Decimal and Date fields
    const serializedProductOnBranch = {
      ...productOnBranch,
      stock: Number(productOnBranch.stock),
      minStock: productOnBranch.minStock ? Number(productOnBranch.minStock) : null,
      maxStock: productOnBranch.maxStock ? Number(productOnBranch.maxStock) : null,
      lastRestocked: productOnBranch.lastRestocked
        ? productOnBranch.lastRestocked.toISOString()
        : null,
      createdAt: productOnBranch.createdAt.toISOString(),
      updatedAt: productOnBranch.updatedAt.toISOString(),
    };

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: serializedProductOnBranch };
  } catch (error) {
    console.error("Error setting product on branch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al configurar el producto en la sucursal"
    };
  }
}

/**
 * Obtiene productos con bajo stock en una sucursal
 */
export async function getLowStockProducts(branchId: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        minStockAlert: { not: null },
        branches: {
          some: {
            branchId,
            isActive: true,
          },
        },
      },
      include: {
        category: true,
        branches: {
          where: { branchId },
          include: {
            branch: true,
            prices: true,
          },
        },
      },
    });

    // Filtrar productos donde stock < minStockAlert
    const lowStockProducts = products.filter(product => {
      const branchData = product.branches[0];
      if (!branchData || !product.minStockAlert) return false;
      return Number(branchData.stock) < Number(product.minStockAlert);
    });

    return { success: true, data: lowStockProducts };
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener productos con bajo stock"
    };
  }
}

/**
 * Obtiene todas las categorías de un restaurante
 */
export async function getCategories(restaurantId: string) {
  try {
    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { order: "asc" },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener las categorías"
    };
  }
}
