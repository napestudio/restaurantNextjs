"use server";

import type { Menu, MenuItem, MenuSection, MenuItemGroup } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Types for serialized data (Decimal -> number, Date -> string)
export type SerializedMenu = Omit<
  Menu,
  "createdAt" | "updatedAt" | "availableFrom" | "availableUntil"
> & {
  createdAt: string;
  updatedAt: string;
  availableFrom: string | null;
  availableUntil: string | null;
  menuSections?: SerializedMenuSection[];
};

export type SerializedMenuSection = Omit<
  MenuSection,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
  menuItems?: SerializedMenuItem[];
  menuItemGroups?: SerializedMenuItemGroup[];
};

export type SerializedMenuItemGroup = Omit<
  MenuItemGroup,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
  menuItems?: SerializedMenuItem[];
};

export type SerializedMenuItem = Omit<
  MenuItem,
  "createdAt" | "updatedAt" | "customPrice"
> & {
  createdAt: string;
  updatedAt: string;
  customPrice: number | null;
  menuItemGroupId: string | null;
  product?: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    categoryId: string | null;
    basePrice?: number | null; // Price from ProductOnBranch for the menu's branch
  };
};

/**
 * Get all menus for a restaurant with their sections and items
 */
// Helper type for menu item with product from Prisma query
type MenuItemWithProduct = MenuItem & {
  product: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    categoryId: string | null;
    branches: {
      branchId: string;
      prices: { price: unknown }[];
    }[];
  };
};

// Helper to serialize menu items
function serializeMenuItem(
  item: MenuItemWithProduct,
  branchId: string
): SerializedMenuItem {
  const branchProduct = item.product.branches.find(
    (b) => b.branchId === branchId
  );
  const basePrice = branchProduct?.prices[0]?.price;

  return {
    id: item.id,
    menuSectionId: item.menuSectionId,
    menuItemGroupId: item.menuItemGroupId,
    productId: item.productId,
    order: item.order,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    customPrice: item.customPrice ? Number(item.customPrice) : null,
    product: {
      id: item.product.id,
      name: item.product.name,
      description: item.product.description,
      imageUrl: item.product.imageUrl,
      categoryId: item.product.categoryId,
      basePrice: basePrice ? Number(basePrice) : null,
    },
  };
}

// Common include for menu items with product
const menuItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      categoryId: true,
      branches: {
        select: {
          branchId: true,
          prices: {
            where: { type: "DINE_IN" as const },
            select: { price: true },
          },
        },
      },
    },
  },
};

export async function getMenus(
  restaurantId: string
): Promise<SerializedMenu[]> {
  const menus = await prisma.menu.findMany({
    where: { restaurantId },
    include: {
      menuSections: {
        orderBy: { order: "asc" },
        include: {
          menuItems: {
            orderBy: { order: "asc" },
            include: menuItemInclude,
          },
          menuItemGroups: {
            orderBy: { order: "asc" },
            include: {
              menuItems: {
                orderBy: { order: "asc" },
                include: menuItemInclude,
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
      // Only include ungrouped items at section level
      menuItems: section.menuItems
        .filter((item) => !item.menuItemGroupId)
        .map((item) => serializeMenuItem(item, menu.branchId)),
      menuItemGroups: section.menuItemGroups.map((group) => ({
        ...group,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        menuItems: group.menuItems.map((item) =>
          serializeMenuItem(item, menu.branchId)
        ),
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
            include: menuItemInclude,
          },
          menuItemGroups: {
            orderBy: { order: "asc" },
            include: {
              menuItems: {
                orderBy: { order: "asc" },
                include: menuItemInclude,
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
      // Only include ungrouped items at section level
      menuItems: section.menuItems
        .filter((item) => !item.menuItemGroupId)
        .map((item) => serializeMenuItem(item, menu.branchId)),
      menuItemGroups: section.menuItemGroups.map((group) => ({
        ...group,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        menuItems: group.menuItems.map((item) =>
          serializeMenuItem(item, menu.branchId)
        ),
      })),
    })),
  };
}

/**
 * Create a new menu
 * Note: Menus are available 24/7 by default. Time and day restrictions are not set.
 */
export async function createMenu(data: {
  restaurantId: string;
  name: string;
  slug: string;
  description?: string;
  branchId?: string; // Optional - will use BRANCH_ID from env if not provided
  isActive?: boolean;
}) {
  try {
    const branchId = data.branchId || process.env.BRANCH_ID;
    if (!branchId) {
      return { success: false, error: "Branch ID is required" };
    }

    const menu = await prisma.menu.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        slug: data.slug.toLowerCase(),
        description: data.description,
        branchId,
        isActive: data.isActive ?? true,
        // Available 24/7 by default - no time or day restrictions
        availableFrom: null,
        availableUntil: null,
        daysOfWeek: [],
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
    showPrices?: boolean;
    availableFrom?: string;
    availableUntil?: string;
    daysOfWeek?: string[];
  }
) {
  try {
    const menu = await prisma.menu.update({
      where: { id: menuId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug.toLowerCase() }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.branchId !== undefined && { branchId: data.branchId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.showPrices !== undefined && { showPrices: data.showPrices }),
        ...(data.availableFrom !== undefined && {
          availableFrom: data.availableFrom
            ? new Date(`1970-01-01T${data.availableFrom}:00Z`)
            : null,
        }),
        ...(data.availableUntil !== undefined && {
          availableUntil: data.availableUntil
            ? new Date(`1970-01-01T${data.availableUntil}:00Z`)
            : null,
        }),
        ...(data.daysOfWeek !== undefined && { daysOfWeek: data.daysOfWeek }),
      },
    });

    revalidatePath("/dashboard/menus");

    // Serialize dates for client component consumption
    const serializedMenu: SerializedMenu = {
      ...menu,
      createdAt: menu.createdAt.toISOString(),
      updatedAt: menu.updatedAt.toISOString(),
      availableFrom: menu.availableFrom?.toISOString() ?? null,
      availableUntil: menu.availableUntil?.toISOString() ?? null,
    };

    return { success: true, menu: serializedMenu };
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
 * Add a product to a menu section (optionally within a group)
 */
export async function addMenuItem(data: {
  menuSectionId: string;
  productId: string;
  menuItemGroupId?: string | null;
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
        menuItemGroupId: data.menuItemGroupId ?? null,
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
    // Serialize Decimal to number for Client Components
    return {
      success: true,
      menuItem: {
        ...menuItem,
        customPrice: menuItem.customPrice ? Number(menuItem.customPrice) : null,
      },
    };
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
    menuItemGroupId?: string | null;
  }
) {
  try {
    const menuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isAvailable !== undefined && {
          isAvailable: data.isAvailable,
        }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.customPrice !== undefined && {
          customPrice: data.customPrice,
        }),
        ...(data.menuItemGroupId !== undefined && {
          menuItemGroupId: data.menuItemGroupId,
        }),
      },
    });

    revalidatePath("/dashboard/menus");
    // Serialize Decimal to number for Client Components
    return {
      success: true,
      menuItem: {
        ...menuItem,
        customPrice: menuItem.customPrice ? Number(menuItem.customPrice) : null,
      },
    };
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
export async function reorderMenuSections(
  sections: { id: string; order: number }[]
) {
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

/**
 * Get a menu by slug with restaurant information
 */
export async function getMenuBySlug(slug: string): Promise<{
  menu: SerializedMenu;
  restaurant: {
    name: string;
    logoUrl: string | null;
    description: string | null;
  };
} | null> {
  const menu = await prisma.menu.findFirst({
    where: {
      slug: slug.toLowerCase(),
      isActive: true,
    },
    include: {
      restaurant: {
        select: {
          name: true,
          logoUrl: true,
          description: true,
        },
      },
      menuSections: {
        orderBy: { order: "asc" },
        include: {
          menuItems: {
            orderBy: { order: "asc" },
            where: {
              isAvailable: true,
            },
            include: menuItemInclude,
          },
          menuItemGroups: {
            orderBy: { order: "asc" },
            include: {
              menuItems: {
                orderBy: { order: "asc" },
                where: {
                  isAvailable: true,
                },
                include: menuItemInclude,
              },
            },
          },
        },
      },
    },
  });

  if (!menu) return null;

  return {
    menu: {
      ...menu,
      createdAt: menu.createdAt.toISOString(),
      updatedAt: menu.updatedAt.toISOString(),
      availableFrom: menu.availableFrom?.toISOString() ?? null,
      availableUntil: menu.availableUntil?.toISOString() ?? null,
      menuSections: menu.menuSections.map((section) => ({
        ...section,
        createdAt: section.createdAt.toISOString(),
        updatedAt: section.updatedAt.toISOString(),
        // Only include ungrouped items at section level
        menuItems: section.menuItems
          .filter((item) => !item.menuItemGroupId)
          .map((item) => serializeMenuItem(item, menu.branchId)),
        menuItemGroups: section.menuItemGroups.map((group) => ({
          ...group,
          createdAt: group.createdAt.toISOString(),
          updatedAt: group.updatedAt.toISOString(),
          menuItems: group.menuItems.map((item) =>
            serializeMenuItem(item, menu.branchId)
          ),
        })),
      })),
    },
    restaurant: menu.restaurant,
  };
}

// ============================================
// MENU ITEM GROUP CRUD OPERATIONS
// ============================================

/**
 * Create a menu item group within a section
 */
export async function createMenuItemGroup(data: {
  menuSectionId: string;
  name: string;
  description?: string;
  order?: number;
}) {
  try {
    const group = await prisma.menuItemGroup.create({
      data: {
        menuSectionId: data.menuSectionId,
        name: data.name,
        description: data.description,
        order: data.order ?? 0,
      },
    });

    revalidatePath("/dashboard/menus");
    return {
      success: true,
      group: {
        ...group,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        menuItems: [],
      } as SerializedMenuItemGroup,
    };
  } catch (error) {
    console.error("Error creating menu item group:", error);
    return { success: false, error: "Failed to create menu item group" };
  }
}

/**
 * Update a menu item group
 */
export async function updateMenuItemGroup(
  groupId: string,
  data: {
    name?: string;
    description?: string;
    order?: number;
  }
) {
  try {
    const group = await prisma.menuItemGroup.update({
      where: { id: groupId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    revalidatePath("/dashboard/menus");
    return {
      success: true,
      group: {
        ...group,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error updating menu item group:", error);
    return { success: false, error: "Failed to update menu item group" };
  }
}

/**
 * Delete a menu item group (items become ungrouped)
 */
export async function deleteMenuItemGroup(groupId: string) {
  try {
    await prisma.menuItemGroup.delete({
      where: { id: groupId },
    });

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error deleting menu item group:", error);
    return { success: false, error: "Failed to delete menu item group" };
  }
}

/**
 * Reorder menu item groups within a section
 */
export async function reorderMenuItemGroups(
  groups: { id: string; order: number }[]
) {
  try {
    await prisma.$transaction(
      groups.map((group) =>
        prisma.menuItemGroup.update({
          where: { id: group.id },
          data: { order: group.order },
        })
      )
    );

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error reordering menu item groups:", error);
    return { success: false, error: "Failed to reorder menu item groups" };
  }
}

/**
 * Move a menu item to a group (or remove from group)
 */
export async function moveMenuItemToGroup(
  itemId: string,
  groupId: string | null
) {
  try {
    const menuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: { menuItemGroupId: groupId },
    });

    revalidatePath("/dashboard/menus");
    return {
      success: true,
      menuItem: {
        ...menuItem,
        customPrice: menuItem.customPrice ? Number(menuItem.customPrice) : null,
      },
    };
  } catch (error) {
    console.error("Error moving menu item to group:", error);
    return { success: false, error: "Failed to move menu item to group" };
  }
}

/**
 * Reorder section content (items and groups together) with support for moving items in/out of groups
 * This handles the mixed ordering where items and groups can be interleaved
 */
export async function reorderSectionContent(data: {
  items: { id: string; order: number; menuItemGroupId: string | null }[];
  groups: { id: string; order: number }[];
}) {
  try {
    await prisma.$transaction([
      // Update all items with their new order and group assignment
      ...data.items.map((item) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: {
            order: item.order,
            menuItemGroupId: item.menuItemGroupId,
          },
        })
      ),
      // Update all groups with their new order
      ...data.groups.map((group) =>
        prisma.menuItemGroup.update({
          where: { id: group.id },
          data: { order: group.order },
        })
      ),
    ]);

    revalidatePath("/dashboard/menus");
    return { success: true };
  } catch (error) {
    console.error("Error reordering section content:", error);
    return { success: false, error: "Failed to reorder section content" };
  }
}
