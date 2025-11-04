"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Menu, MenuSection, MenuItem, Product } from "@/app/generated/prisma";

// Types for serialized data (Decimal -> number, Date -> string)
export type SerializedMenu = Omit<Menu, "createdAt" | "updatedAt" | "availableFrom" | "availableUntil"> & {
  createdAt: string;
  updatedAt: string;
  availableFrom: string | null;
  availableUntil: string | null;
  menuSections?: SerializedMenuSection[];
};

export type SerializedMenuSection = Omit<MenuSection, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  menuItems?: SerializedMenuItem[];
};

export type SerializedMenuItem = Omit<MenuItem, "createdAt" | "updatedAt" | "customPrice"> & {
  createdAt: string;
  updatedAt: string;
  customPrice: number | null;
  product?: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    categoryId: string | null;
  };
};

/**
 * Get all menus for a restaurant with their sections and items
 */
export async function getMenus(restaurantId: string): Promise<SerializedMenu[]> {
  const menus = await prisma.menu.findMany({
    where: { restaurantId },
    include: {
      menuSections: {
        orderBy: { order: "asc" },
        include: {
          menuItems: {
            orderBy: { order: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  imageUrl: true,
                  categoryId: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return menus.map((menu) => ({
    ...menu,
    createdAt: menu.createdAt.toISOString(),
    updatedAt: menu.updatedAt.toISOString(),
    availableFrom: menu.availableFrom?.toISOString() ?? null,
    availableUntil: menu.availableUntil?.toISOString() ?? null,
    menuSections: menu.menuSections.map((section) => ({
      ...section,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
      menuItems: section.menuItems.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        customPrice: item.customPrice ? Number(item.customPrice) : null,
        product: item.product,
      })),
    })),
  }));
}

/**
 * Get a single menu by ID with all details
 */
export async function getMenu(menuId: string): Promise<SerializedMenu | null> {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      menuSections: {
        orderBy: { order: "asc" },
        include: {
          menuItems: {
            orderBy: { order: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  imageUrl: true,
                  categoryId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!menu) return null;

  return {
    ...menu,
    createdAt: menu.createdAt.toISOString(),
    updatedAt: menu.updatedAt.toISOString(),
    availableFrom: menu.availableFrom?.toISOString() ?? null,
    availableUntil: menu.availableUntil?.toISOString() ?? null,
    menuSections: menu.menuSections.map((section) => ({
      ...section,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
      menuItems: section.menuItems.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        customPrice: item.customPrice ? Number(item.customPrice) : null,
        product: item.product,
      })),
    })),
  };
}

/**
 * Create a new menu
 */
export async function createMenu(data: {
  restaurantId: string;
  name: string;
  slug: string;
  description?: string;
  branchId?: string;
  isActive?: boolean;
  availableFrom?: string; // ISO time string
  availableUntil?: string; // ISO time string
  daysOfWeek?: string[];
}) {
  try {
    const menu = await prisma.menu.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        slug: data.slug.toLowerCase(),
        description: data.description,
        branchId: data.branchId,
        isActive: data.isActive ?? true,
        availableFrom: data.availableFrom ? new Date(`1970-01-01T${data.availableFrom}`) : null,
        availableUntil: data.availableUntil ? new Date(`1970-01-01T${data.availableUntil}`) : null,
        daysOfWeek: data.daysOfWeek ?? [],
      },
    });

    revalidatePath("/dashboard/menus");
    return { success: true, menu };
  } catch (error) {
    console.error("Error creating menu:", error);
    return { success: false, error: "Failed to create menu" };
  }
}

/**
 * Update an existing menu
 */
export async function updateMenu(
  menuId: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    branchId?: string;
    isActive?: boolean;
    availableFrom?: string; // ISO time string
    availableUntil?: string; // ISO time string
    daysOfWeek?: string[];
  }
) {
  try {
    const menu = await prisma.menu.update({
      where: { id: menuId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug.toLowerCase() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.branchId !== undefined && { branchId: data.branchId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.availableFrom !== undefined && {
          availableFrom: data.availableFrom ? new Date(`1970-01-01T${data.availableFrom}`) : null,
        }),
        ...(data.availableUntil !== undefined && {
          availableUntil: data.availableUntil ? new Date(`1970-01-01T${data.availableUntil}`) : null,
        }),
        ...(data.daysOfWeek !== undefined && { daysOfWeek: data.daysOfWeek }),
      },
    });

    revalidatePath("/dashboard/menus");
    return { success: true, menu };
  } catch (error) {
    console.error("Error updating menu:", error);
    return { success: false, error: "Failed to update menu" };
  }
}

/**
 * Delete a menu
 */
export async function deleteMenu(menuId: string) {
  try {
    await prisma.menu.delete({
      where: { id: menuId },
    });

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error deleting menu:", error);
    return { success: false, error: "Failed to delete menu" };
  }
}

/**
 * Create a menu section
 */
export async function createMenuSection(data: {
  menuId: string;
  name: string;
  description?: string;
  order?: number;
}) {
  try {
    const section = await prisma.menuSection.create({
      data: {
        menuId: data.menuId,
        name: data.name,
        description: data.description,
        order: data.order ?? 0,
      },
    });

    revalidatePath("/dashboard/menus");
    return { success: true, section };
  } catch (error) {
    console.error("Error creating menu section:", error);
    return { success: false, error: "Failed to create menu section" };
  }
}

/**
 * Update a menu section
 */
export async function updateMenuSection(
  sectionId: string,
  data: {
    name?: string;
    description?: string;
    order?: number;
  }
) {
  try {
    const section = await prisma.menuSection.update({
      where: { id: sectionId },
      data,
    });

    revalidatePath("/dashboard/menus");
    return { success: true, section };
  } catch (error) {
    console.error("Error updating menu section:", error);
    return { success: false, error: "Failed to update menu section" };
  }
}

/**
 * Delete a menu section
 */
export async function deleteMenuSection(sectionId: string) {
  try {
    await prisma.menuSection.delete({
      where: { id: sectionId },
    });

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error deleting menu section:", error);
    return { success: false, error: "Failed to delete menu section" };
  }
}

/**
 * Add a product to a menu section
 */
export async function addMenuItem(data: {
  menuSectionId: string;
  productId: string;
  order?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  customPrice?: number;
}) {
  try {
    const menuItem = await prisma.menuItem.create({
      data: {
        menuSectionId: data.menuSectionId,
        productId: data.productId,
        order: data.order ?? 0,
        isAvailable: data.isAvailable ?? true,
        isFeatured: data.isFeatured ?? false,
        customPrice: data.customPrice,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            categoryId: true,
          },
        },
      },
    });

    revalidatePath("/dashboard/menus");
    return { success: true, menuItem };
  } catch (error) {
    console.error("Error adding menu item:", error);
    return { success: false, error: "Failed to add menu item" };
  }
}

/**
 * Update a menu item
 */
export async function updateMenuItem(
  itemId: string,
  data: {
    order?: number;
    isAvailable?: boolean;
    isFeatured?: boolean;
    customPrice?: number | null;
  }
) {
  try {
    const menuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.customPrice !== undefined && { customPrice: data.customPrice }),
      },
    });

    revalidatePath("/dashboard/menus");
    return { success: true, menuItem };
  } catch (error) {
    console.error("Error updating menu item:", error);
    return { success: false, error: "Failed to update menu item" };
  }
}

/**
 * Remove a menu item
 */
export async function removeMenuItem(itemId: string) {
  try {
    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error removing menu item:", error);
    return { success: false, error: "Failed to remove menu item" };
  }
}

/**
 * Reorder menu sections
 */
export async function reorderMenuSections(sections: { id: string; order: number }[]) {
  try {
    await prisma.$transaction(
      sections.map((section) =>
        prisma.menuSection.update({
          where: { id: section.id },
          data: { order: section.order },
        })
      )
    );

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error reordering menu sections:", error);
    return { success: false, error: "Failed to reorder menu sections" };
  }
}

/**
 * Reorder menu items within a section
 */
export async function reorderMenuItems(items: { id: string; order: number }[]) {
  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error reordering menu items:", error);
    return { success: false, error: "Failed to reorder menu items" };
  }
}

/**
 * Get available products for a restaurant (to add to menu)
 */
export async function getAvailableProducts(restaurantId: string): Promise<
  {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    categoryId: string | null;
    category: { name: string } | null;
  }[]
> {
  const products = await prisma.product.findMany({
    where: {
      restaurantId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      categoryId: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Explicitly map to ensure no Decimal fields leak through
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId,
    category: product.category,
  }));
}
