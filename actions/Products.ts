"use server";

import {
  PriceType,
  Prisma,
  UnitType,
  UserRole,
  VolumeUnit,
  WeightUnit,
} from "@/app/generated/prisma";
import {
  deleteImage,
  extractPublicIdFromUrl,
} from "@/lib/cloudinary/upload-helper";
import { CSVImportInput, CSVImportResult } from "@/lib/csv/csv-types";
import { authorizeAction } from "@/lib/permissions/middleware";
import { prisma } from "@/lib/prisma";
import { generateProductSKU } from "@/lib/sku-generator";
import { revalidatePath } from "next/cache";

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

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
};

/**
 * Crea un nuevo producto (menu item)
 */
export async function createMenuItem(input: CreateMenuItemInput) {
  try {
    // Generate SKU if not provided
    const finalSku =
      input.sku ||
      (await generateProductSKU(input.restaurantId, input.categoryId));

    const product = await prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        sku: finalSku,
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
      minStockAlert: product.minStockAlert
        ? Number(product.minStockAlert)
        : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: serializedProduct };
  } catch (error) {
    console.error("Error creating menu item:", error);

    // Handle unique constraint errors with user-friendly messages
    if (error instanceof Error) {
      if (
        error.message.includes("Unique constraint") &&
        error.message.includes("restaurantId") &&
        error.message.includes("name")
      ) {
        return {
          success: false,
          error: "Ya existe un producto con este nombre en tu restaurante",
        };
      }
      if (
        error.message.includes("Unique constraint") &&
        error.message.includes("sku")
      ) {
        return {
          success: false,
          error: "El código SKU ya está en uso",
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Error al crear el producto",
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
      minStockAlert: product.minStockAlert
        ? Number(product.minStockAlert)
        : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: serializedProduct };
  } catch (error) {
    console.error("Error updating menu item:", error);

    // Handle unique constraint errors with user-friendly messages
    if (error instanceof Error) {
      if (
        error.message.includes("Unique constraint") &&
        error.message.includes("restaurantId") &&
        error.message.includes("name")
      ) {
        return {
          success: false,
          error: "Ya existe un producto con este nombre en tu restaurante",
        };
      }
      if (
        error.message.includes("Unique constraint") &&
        error.message.includes("sku")
      ) {
        return {
          success: false,
          error: "El código SKU ya está en uso",
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Error al actualizar el producto",
    };
  }
}

/**
 * Elimina un producto (soft delete)
 */
export async function deleteMenuItem(id: string) {
  try {
    // Get product to retrieve imageUrl before deletion
    const product = await prisma.product.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    // Soft delete (mark as inactive)
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Clean up image if exists
    if (product?.imageUrl) {
      deleteProductImage(product.imageUrl).catch((err) => {
        console.warn("Failed to delete product image:", err);
      });
    }

    revalidatePath("/dashboard/menu-items");
    return { success: true };
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al eliminar el producto",
    };
  }
}

/**
 * Deletes a product image from Cloudinary
 * Called when updating/removing product images to clean up storage
 */
export async function deleteProductImage(imageUrl: string) {
  try {
    // Validate that the URL is from Cloudinary
    if (!imageUrl || !imageUrl.includes("cloudinary.com")) {
      console.warn(
        "[deleteProductImage] Not a Cloudinary URL, skipping deletion:",
        imageUrl,
      );
      return { success: false, error: "Invalid image URL" };
    }

    const publicId = extractPublicIdFromUrl(imageUrl);
    if (!publicId) {
      console.warn(
        "[deleteProductImage] Could not extract public ID from URL:",
        imageUrl,
      );
      return { success: false, error: "Could not extract public ID from URL" };
    }

    const result = await deleteImage(publicId);
    return result;
  } catch (error) {
    console.error("[deleteProductImage] Error deleting product image:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al eliminar la imagen",
    };
  }
}

/**
 * Duplica un producto con todas sus configuraciones de sucursales y precios
 */
export async function duplicateProduct(productId: string) {
  try {
    // Authorization check
    await authorizeAction(UserRole.ADMIN);

    // 1. Fetch original product with all related data
    const originalProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        branches: {
          include: {
            prices: true,
            branch: true,
          },
        },
      },
    });

    if (!originalProduct) {
      return { success: false, error: "Producto no encontrado" };
    }

    // 2. Generate unique name (append " - copia", " - copia 2", etc.)
    let newName = `${originalProduct.name} - copia`;
    let suffix = 2;
    let nameExists = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    while (nameExists && attempts < MAX_ATTEMPTS) {
      const existing = await prisma.product.findUnique({
        where: {
          restaurantId_name: {
            restaurantId: originalProduct.restaurantId,
            name: newName,
          },
        },
      });

      if (!existing) {
        nameExists = false;
      } else {
        newName = `${originalProduct.name} - copia ${suffix}`;
        suffix++;
        attempts++;
      }
    }

    if (attempts >= MAX_ATTEMPTS) {
      return {
        success: false,
        error: "No se pudo generar un nombre único para la copia",
      };
    }

    // 3. Generate unique SKU for duplicated product
    const newSku = await generateProductSKU(
      originalProduct.restaurantId,
      originalProduct.categoryId,
    );

    // 4. Create duplicated product with transaction
    const duplicatedProduct = await prisma.$transaction(async (tx) => {
      // Create main product
      const newProduct = await tx.product.create({
        data: {
          name: newName,
          description: originalProduct.description,
          imageUrl: originalProduct.imageUrl,
          sku: newSku,
          unitType: originalProduct.unitType,
          weightUnit: originalProduct.weightUnit,
          volumeUnit: originalProduct.volumeUnit,
          minStockAlert: originalProduct.minStockAlert,
          trackStock: originalProduct.trackStock,
          categoryId: originalProduct.categoryId,
          restaurantId: originalProduct.restaurantId,
          isActive: originalProduct.isActive,
        },
      });

      // Create ProductOnBranch entries with prices
      for (const branchConfig of originalProduct.branches) {
        const productOnBranch = await tx.productOnBranch.create({
          data: {
            productId: newProduct.id,
            branchId: branchConfig.branchId,
            stock: branchConfig.stock,
            minStock: branchConfig.minStock,
            maxStock: branchConfig.maxStock,
            isActive: branchConfig.isActive,
          },
        });

        // Create prices for this branch
        for (const price of branchConfig.prices) {
          await tx.productPrice.create({
            data: {
              productOnBranchId: productOnBranch.id,
              type: price.type,
              price: price.price,
            },
          });
        }
      }

      // Fetch complete product with all relations
      return await tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          category: true,
          branches: {
            include: {
              prices: true,
              branch: true,
            },
          },
        },
      });
    });

    if (!duplicatedProduct) {
      throw new Error("Error al obtener el producto duplicado");
    }

    // 5. Serialize for client
    const serializedProduct = {
      ...duplicatedProduct,
      minStockAlert: duplicatedProduct.minStockAlert
        ? Number(duplicatedProduct.minStockAlert)
        : null,
      createdAt: duplicatedProduct.createdAt.toISOString(),
      updatedAt: duplicatedProduct.updatedAt.toISOString(),
      branches: duplicatedProduct.branches.map((branch) => ({
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
    };

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: serializedProduct };
  } catch (error) {
    console.error("Error duplicating product:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al duplicar el producto",
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
      minStockAlert: product.minStockAlert
        ? Number(product.minStockAlert)
        : null,
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
      error:
        error instanceof Error
          ? error.message
          : "Error al obtener los productos",
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
      error:
        error instanceof Error ? error.message : "Error al obtener el producto",
    };
  }
}

/**
 * Configura un producto en una sucursal específica (stock y precios)
 */
export async function setProductOnBranch(input: SetProductBranchInput) {
  try {
    // Authorization check - only ADMIN and above can set product prices
    await authorizeAction(UserRole.ADMIN);

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

    // Fetch the complete productOnBranch with prices
    const completeProductOnBranch = await prisma.productOnBranch.findUnique({
      where: { id: productOnBranch.id },
      include: {
        prices: true,
      },
    });

    if (!completeProductOnBranch) {
      throw new Error("Error al obtener los datos del producto");
    }

    // Serialize Decimal and Date fields
    const serializedProductOnBranch = {
      ...completeProductOnBranch,
      stock: Number(completeProductOnBranch.stock),
      minStock: completeProductOnBranch.minStock
        ? Number(completeProductOnBranch.minStock)
        : null,
      maxStock: completeProductOnBranch.maxStock
        ? Number(completeProductOnBranch.maxStock)
        : null,
      lastRestocked: completeProductOnBranch.lastRestocked
        ? completeProductOnBranch.lastRestocked.toISOString()
        : null,
      createdAt: completeProductOnBranch.createdAt.toISOString(),
      updatedAt: completeProductOnBranch.updatedAt.toISOString(),
      prices: completeProductOnBranch.prices.map((price) => ({
        ...price,
        price: Number(price.price),
      })),
    };

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: serializedProductOnBranch };
  } catch (error) {
    console.error("Error setting product on branch:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al configurar el producto en la sucursal",
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
    const lowStockProducts = products.filter((product) => {
      const branchData = product.branches[0];
      if (!branchData || !product.minStockAlert) return false;
      return Number(branchData.stock) < Number(product.minStockAlert);
    });

    return { success: true, data: lowStockProducts };
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al obtener productos con bajo stock",
    };
  }
}

/**
 * Obtiene productos con paginación y filtros
 */
export async function getMenuItemsPaginated(params: {
  restaurantId: string;
  branchId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  stockStatus?: string;
  unitType?: string;
  includeInactive?: boolean;
}) {
  try {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      restaurantId: params.restaurantId,
    };

    // Active filter
    if (!params.includeInactive) {
      where.isActive = true;
    }

    // Search filter
    if (params.search) {
      where.name = {
        contains: params.search,
        mode: "insensitive",
      };
    }

    // Category filter
    if (params.categoryId && params.categoryId !== "all") {
      if (params.categoryId === "uncategorized") {
        where.categoryId = null;
      } else {
        where.categoryId = params.categoryId;
      }
    }

    // Unit type filter
    if (params.unitType && params.unitType !== "all") {
      where.unitType = params.unitType as UnitType;
    }

    // Get total count and products
    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          branches: {
            where: { branchId: params.branchId },
            include: {
              branch: true,
              prices: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        skip,
        take: pageSize,
      }),
    ]);

    // Apply stock status filter (post-query)
    let filteredProducts = products;
    if (params.stockStatus && params.stockStatus !== "all") {
      filteredProducts = products.filter((product) => {
        const branchData = product.branches[0];
        const stock = branchData ? Number(branchData.stock) : 0;
        const minStockAlert = product.minStockAlert
          ? Number(product.minStockAlert)
          : 0;

        switch (params.stockStatus) {
          case "in_stock":
            return product.trackStock && stock > 0;
          case "low_stock":
            return (
              product.trackStock && minStockAlert > 0 && stock < minStockAlert
            );
          case "out_stock":
            return product.trackStock && stock === 0;
          case "always_available":
            return !product.trackStock;
          default:
            return true;
        }
      });
    }

    // Serialize Decimal and Date fields
    const serializedProducts = filteredProducts.map((product) => ({
      ...product,
      minStockAlert: product.minStockAlert
        ? Number(product.minStockAlert)
        : null,
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

    const pagination: PaginationInfo = {
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount,
    };

    return {
      success: true,
      data: {
        products: serializedProducts,
        pagination,
      },
    };
  } catch (error) {
    console.error("Error fetching paginated menu items:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al obtener los productos",
    };
  }
}

/**
 * Exporta productos a CSV
 */
export async function exportMenuItemsCSV(params: {
  restaurantId: string;
  branchId: string;
  search?: string;
  categoryId?: string;
  stockStatus?: string;
  unitType?: string;
  includeInactive?: boolean;
}) {
  try {
    // Authorization check
    await authorizeAction(UserRole.MANAGER);

    // Build where clause (same as paginated)
    const where: Prisma.ProductWhereInput = {
      restaurantId: params.restaurantId,
    };

    if (!params.includeInactive) {
      where.isActive = true;
    }

    if (params.search) {
      where.name = {
        contains: params.search,
        mode: "insensitive",
      };
    }

    if (params.categoryId && params.categoryId !== "all") {
      if (params.categoryId === "uncategorized") {
        where.categoryId = null;
      } else {
        where.categoryId = params.categoryId;
      }
    }

    if (params.unitType && params.unitType !== "all") {
      where.unitType = params.unitType as UnitType;
    }

    // Fetch ALL matching products (no pagination)
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        branches: {
          where: { branchId: params.branchId },
          include: {
            prices: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Apply stock status filter
    let filteredProducts = products;
    if (params.stockStatus && params.stockStatus !== "all") {
      filteredProducts = products.filter((product) => {
        const branchData = product.branches[0];
        const stock = branchData ? Number(branchData.stock) : 0;
        const minStockAlert = product.minStockAlert
          ? Number(product.minStockAlert)
          : 0;

        switch (params.stockStatus) {
          case "in_stock":
            return product.trackStock && stock > 0;
          case "low_stock":
            return (
              product.trackStock && minStockAlert > 0 && stock < minStockAlert
            );
          case "out_stock":
            return product.trackStock && stock === 0;
          case "always_available":
            return !product.trackStock;
          default:
            return true;
        }
      });
    }

    // CSV escape function
    const escapeCsv = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Get unit label
    const getUnitLabel = (
      unitType: UnitType,
      weightUnit: WeightUnit | null,
      volumeUnit: VolumeUnit | null,
    ): string => {
      if (unitType === "WEIGHT" && weightUnit) {
        return weightUnit;
      }
      if (unitType === "VOLUME" && volumeUnit) {
        return volumeUnit;
      }
      return "Unidades";
    };

    // Generate CSV
    const headers = [
      "Nombre",
      "SKU",
      "Categoría",
      "Stock",
      "Stock Mínimo",
      "Precio Comedor",
      "Precio Para Llevar",
      "Precio Delivery",
      "Tipo de Unidad",
      "Descripción",
      "Activo",
    ];

    const rows = filteredProducts.map((product) => {
      const branchData = product.branches[0];
      const stock = branchData ? Number(branchData.stock) : 0;
      const dineInPrice = branchData?.prices.find((p) => p.type === "DINE_IN");
      const takeAwayPrice = branchData?.prices.find(
        (p) => p.type === "TAKE_AWAY",
      );
      const deliveryPrice = branchData?.prices.find(
        (p) => p.type === "DELIVERY",
      );

      return [
        escapeCsv(product.name),
        escapeCsv(product.sku || "Sin SKU"),
        escapeCsv(product.category?.name || "Sin categoría"),
        product.trackStock ? escapeCsv(stock) : escapeCsv("Siempre disponible"),
        escapeCsv(
          product.minStockAlert ? Number(product.minStockAlert) : "N/A",
        ),
        escapeCsv(
          dineInPrice ? `$${Number(dineInPrice.price).toFixed(2)}` : "-",
        ),
        escapeCsv(
          takeAwayPrice ? `$${Number(takeAwayPrice.price).toFixed(2)}` : "-",
        ),
        escapeCsv(
          deliveryPrice ? `$${Number(deliveryPrice.price).toFixed(2)}` : "-",
        ),
        escapeCsv(
          getUnitLabel(
            product.unitType,
            product.weightUnit,
            product.volumeUnit,
          ),
        ),
        escapeCsv(product.description?.substring(0, 100) || ""),
        escapeCsv(product.isActive ? "Sí" : "No"),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    // Generate filename
    const filename = `productos-${new Date().toISOString().slice(0, 10)}.csv`;

    // Convert to base64 data URL
    const base64 = Buffer.from(csv, "utf-8").toString("base64");
    const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`;

    return {
      success: true,
      data: {
        dataUrl,
        filename,
      },
    };
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al exportar CSV",
    };
  }
}

/**
 * Imports products from CSV data
 * Supports update-or-create and create-only modes
 * Processes in batches with detailed error reporting
 */
export async function importProductsCSV(
  input: CSVImportInput,
): Promise<CSVImportResult> {
  try {
    // Authorization check (same level as export)
    await authorizeAction(UserRole.MANAGER);

    // Initialize result
    const result = {
      success: true,
      summary: {
        total: input.rows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      errors: [] as Array<{
        row: number;
        product: string;
        field?: string;
        message: string;
        severity: "error" | "warning";
      }>,
    };

    // Fetch categories once for validation
    const categories = await prisma.category.findMany({
      where: { restaurantId: input.restaurantId },
    });

    // Helper function to find category ID
    const findCategoryId = (
      categoryName: string | undefined,
    ): string | null => {
      if (!categoryName || categoryName === "Sin categoría") return null;

      const found = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
      );

      return found?.id || null;
    };

    // Helper function to parse price
    const parsePrice = (value: string | undefined): number | null => {
      if (!value || value.trim() === "" || value === "-") return null;
      const cleaned = value.replace(/[$,\s]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function to parse decimal
    const parseDecimal = (value: string | undefined): number | null => {
      if (!value || value === "Siempre disponible" || value === "N/A")
        return null;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function to parse unit type
    const parseUnitType = (value: string | undefined): UnitType => {
      if (!value || value === "Unidades") return "UNIT";
      if (["KILOGRAM", "GRAM", "POUND", "OUNCE"].includes(value))
        return "WEIGHT";
      if (["LITER", "MILLILITER", "GALLON", "FLUID_OUNCE"].includes(value))
        return "VOLUME";
      return "UNIT";
    };

    // Helper function to parse active status
    const parseActive = (value: string | undefined): boolean => {
      if (!value) return true;
      const lower = value.toLowerCase();
      return (
        lower === "sí" || lower === "si" || lower === "true" || lower === "1"
      );
    };

    // Process in batches of 50 to prevent timeout
    const BATCH_SIZE = 50;

    for (let i = 0; i < input.rows.length; i += BATCH_SIZE) {
      const batch = input.rows.slice(i, i + BATCH_SIZE);

      // Process each row in its own transaction for isolation
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNum = i + j + 2; // +2 for 1-indexed + header row

        try {
          // Basic validation BEFORE starting transaction
          if (!row.Nombre?.trim()) {
            result.summary.failed++;
            result.errors.push({
              row: rowNum,
              product: row.Nombre || "Sin nombre",
              field: "Nombre",
              message: "El nombre del producto es requerido",
              severity: "error",
            });
            continue;
          }

          // Check at least one price BEFORE starting transaction
          const prices = {
            dineIn: parsePrice(row["Precio Comedor"]),
            takeAway: parsePrice(row["Precio Para Llevar"]),
            delivery: parsePrice(row["Precio Delivery"]),
          };

          if (
            prices.dineIn === null &&
            prices.takeAway === null &&
            prices.delivery === null
          ) {
            result.summary.failed++;
            result.errors.push({
              row: rowNum,
              product: row.Nombre,
              field: "Precios",
              message:
                "Debe definir al menos un precio (Comedor, Para Llevar, o Delivery)",
              severity: "error",
            });
            continue;
          }

          // Check for duplicates by SKU (ignore "Sin SKU" placeholder) BEFORE transaction
          let existingProduct = null;
          if (row.SKU?.trim() && row.SKU.trim() !== "Sin SKU") {
            existingProduct = await prisma.product.findFirst({
              where: {
                restaurantId: input.restaurantId,
                sku: row.SKU.trim(),
              },
            });
            if (existingProduct) {
              console.log(
                `[CSV Import] Found existing product by SKU: "${row.Nombre}" (SKU: ${row.SKU.trim()}, ID: ${existingProduct.id})`,
              );
            }
          }

          // Fallback to name matching if no SKU match (case-insensitive)
          if (!existingProduct) {
            existingProduct = await prisma.product.findFirst({
              where: {
                restaurantId: input.restaurantId,
                name: {
                  equals: row.Nombre.trim(),
                  mode: "insensitive",
                },
              },
            });
            if (existingProduct) {
              console.log(
                `[CSV Import] Found existing product by name: "${row.Nombre}" (ID: ${existingProduct.id}, SKU: ${existingProduct.sku})`,
              );
            }
          }

          // Determine action based on mode BEFORE transaction
          const shouldSkip =
            input.mode === "create-only" && existingProduct !== null;

          if (shouldSkip) {
            result.summary.skipped++;
            result.errors.push({
              row: rowNum,
              product: row.Nombre,
              message: "Producto ya existe (modo: crear solo nuevos)",
              severity: "warning",
            });
            continue;
          }

          // Start transaction only after all validations pass
          await prisma.$transaction(async (tx) => {

            // Parse product data
            const categoryId = findCategoryId(row.Categoría);
            const unitType = parseUnitType(row["Tipo de Unidad"]);
            const isActive = parseActive(row.Activo);
            const trackStock = row.Stock !== "Siempre disponible";

            // Determine SKU: preserve existing SKU when updating, or generate for new products
            let finalSku: string;
            const csvSku = row.SKU?.trim();
            const validCsvSku = csvSku && csvSku !== "Sin SKU" ? csvSku : null;

            if (existingProduct) {
              // For updates: use CSV SKU if provided and valid, otherwise keep existing SKU or generate if missing
              finalSku =
                validCsvSku ||
                existingProduct.sku ||
                (await generateProductSKU(input.restaurantId, categoryId));
            } else {
              // For new products: use CSV SKU if provided and valid, otherwise generate
              finalSku =
                validCsvSku ||
                (await generateProductSKU(input.restaurantId, categoryId));
            }

            const productData = {
              name: row.Nombre.trim(),
              description: row.Descripción?.trim() || null,
              sku: finalSku,
              unitType,
              trackStock,
              minStockAlert: parseDecimal(row["Stock Mínimo"])
                ? new Prisma.Decimal(parseDecimal(row["Stock Mínimo"])!)
                : null,
              categoryId,
              isActive,
            };

            // Create or update product
            let productId: string;

            if (existingProduct) {
              // Update existing product
              console.log(
                `[CSV Import] Updating product: "${row.Nombre}" (ID: ${existingProduct.id}, SKU: ${finalSku})`,
              );
              await tx.product.update({
                where: { id: existingProduct.id },
                data: productData,
              });
              productId = existingProduct.id;
              result.summary.updated++;
            } else {
              // Create new product
              console.log(
                `[CSV Import] Creating new product: "${row.Nombre}" (SKU: ${finalSku})`,
              );
              const product = await tx.product.create({
                data: {
                  ...productData,
                  restaurantId: input.restaurantId,
                },
              });
              productId = product.id;
              result.summary.created++;
            }

            // Upsert ProductOnBranch
            const stockValue = parseDecimal(row.Stock) || 0;
            console.log(
              `[CSV Import] Stock for "${row.Nombre}": ${row.Stock} → ${stockValue}`,
            );

            const productOnBranch = await tx.productOnBranch.upsert({
              where: {
                productId_branchId: {
                  productId,
                  branchId: input.branchId,
                },
              },
              create: {
                productId,
                branchId: input.branchId,
                stock: new Prisma.Decimal(stockValue),
                isActive: true,
              },
              update: {
                stock: new Prisma.Decimal(stockValue),
              },
            });
            console.log(
              `[CSV Import] ProductOnBranch upserted: ID=${productOnBranch.id}, Stock=${productOnBranch.stock}`,
            );

            // Delete existing prices and recreate
            const deletedPrices = await tx.productPrice.deleteMany({
              where: { productOnBranchId: productOnBranch.id },
            });
            console.log(
              `[CSV Import] Deleted ${deletedPrices.count} existing prices for "${row.Nombre}"`,
            );

            // Create price records
            const priceRecords: { type: PriceType; price: number }[] = [];

            if (prices.dineIn !== null) {
              priceRecords.push({ type: "DINE_IN", price: prices.dineIn });
            }
            if (prices.takeAway !== null) {
              priceRecords.push({
                type: "TAKE_AWAY",
                price: prices.takeAway,
              });
            }
            if (prices.delivery !== null) {
              priceRecords.push({ type: "DELIVERY", price: prices.delivery });
            }

            console.log(
              `[CSV Import] Creating ${priceRecords.length} prices for "${row.Nombre}":`,
              priceRecords,
            );

            if (priceRecords.length > 0) {
              await tx.productPrice.createMany({
                data: priceRecords.map((p) => ({
                  productOnBranchId: productOnBranch.id,
                  type: p.type,
                  price: new Prisma.Decimal(p.price),
                })),
              });
              console.log(
                `[CSV Import] Successfully created ${priceRecords.length} prices`,
              );
            }
          }); // End transaction
        } catch (error) {
          // Row-level error, continue processing
          console.error(
            `[CSV Import] Error processing row ${rowNum} (${row.Nombre}):`,
            error,
          );
          result.summary.failed++;
          result.errors.push({
            row: rowNum,
            product: row.Nombre || "Sin nombre",
            message:
              error instanceof Error ? error.message : "Error desconocido",
            severity: "error",
          });
        }
      }
    }

    // Revalidate products page
    revalidatePath("/dashboard/menu-items");

    return result;
  } catch (error) {
    console.error("Error importing CSV:", error);
    return {
      success: false,
      summary: {
        total: input.rows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: input.rows.length,
      },
      errors: [
        {
          row: 0,
          product: "Sistema",
          message:
            error instanceof Error
              ? error.message
              : "Error al procesar la importación",
          severity: "error",
        },
      ],
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
      error:
        error instanceof Error
          ? error.message
          : "Error al obtener las categorías",
    };
  }
}

/**
 * Crea una nueva categoría
 */
export async function createCategory(input: {
  name: string;
  order?: number;
  restaurantId: string;
}) {
  try {
    // Si no se especifica orden, obtener el siguiente disponible
    if (input.order === undefined) {
      const lastCategory = await prisma.category.findFirst({
        where: { restaurantId: input.restaurantId },
        orderBy: { order: "desc" },
      });
      input.order = lastCategory ? lastCategory.order + 1 : 0;
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        order: input.order,
        restaurantId: input.restaurantId,
      },
    });

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: category };
  } catch (error) {
    console.error("Error creating category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al crear la categoría",
    };
  }
}

/**
 * Actualiza una categoría existente
 */
export async function updateCategory(input: {
  id: string;
  name?: string;
  order?: number;
}) {
  try {
    const category = await prisma.category.update({
      where: { id: input.id },
      data: {
        name: input.name,
        order: input.order,
      },
    });

    revalidatePath("/dashboard/menu-items");
    return { success: true, data: category };
  } catch (error) {
    console.error("Error updating category:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al actualizar la categoría",
    };
  }
}

/**
 * Elimina una categoría
 */
export async function deleteCategory(id: string) {
  try {
    // Verificar si hay productos asociados
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      return {
        success: false,
        error: `No se puede eliminar la categoría porque tiene ${productsCount} producto(s) asociado(s)`,
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/dashboard/menu-items");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al eliminar la categoría",
    };
  }
}
