"use server";

import prisma from "@/lib/prisma";
import { OrderStatus, OrderType, type Product } from "@/app/generated/prisma";

export type OrderItemInput = {
  productId: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number;
};

// Helper to serialize product (convert Decimal fields to numbers)
function serializeProduct(product: Product | null) {
  if (!product) return null;
  return {
    ...product,
    minStockAlert: product.minStockAlert ? Number(product.minStockAlert) : null,
  };
}

// Create a new dine-in order for a table
export async function createTableOrder(
  tableId: string,
  branchId: string,
  partySize: number
) {
  try {
    // Get table info to check if it's shared
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { isShared: true },
    });

    if (!table) {
      return {
        success: false,
        error: "Mesa no encontrada",
      };
    }

    // Check if table already has an active order (only for non-shared tables)
    if (!table.isShared) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          tableId,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
          },
        },
      });

      if (existingOrder) {
        return {
          success: false,
          error: "Esta mesa ya tiene una orden activa",
        };
      }
    }

    // Generate a unique public code
    const publicCode = `T${Date.now().toString().slice(-8)}`;

    // Create order and update table status in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          branchId,
          tableId,
          partySize,
          type: OrderType.DINE_IN,
          publicCode,
          status: OrderStatus.PENDING,
        },
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: {
              id: "asc",
            },
          },
        },
      });

      // Update table status to OCCUPIED
      await tx.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });

      return newOrder;
    });

    // Convert Decimal fields to numbers (empty items array for new order, but keep consistency)
    const serializedOrder = {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
        product: serializeProduct(item.product),
      })),
    };

    return {
      success: true,
      data: serializedOrder,
    };
  } catch (error) {
    console.error("Error creating table order:", error);
    return {
      success: false,
      error: "Error al crear la orden",
    };
  }
}

// Get active order for a table
// For shared tables, this returns the most recent order
export async function getTableOrder(tableId: string) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        tableId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal fields to numbers for client components
    const serializedOrder = order
      ? {
          ...order,
          items: order.items.map((item) => ({
            ...item,
            price: Number(item.price),
            originalPrice: item.originalPrice
              ? Number(item.originalPrice)
              : null,
            product: serializeProduct(item.product),
          })),
        }
      : null;

    return {
      success: true,
      data: serializedOrder,
    };
  } catch (error) {
    console.error("Error getting table order:", error);
    return {
      success: false,
      error: "Error al obtener la orden",
    };
  }
}

// Get all active orders for a table (useful for shared tables)
export async function getTableOrders(tableId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        tableId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal fields to numbers for client components
    const serializedOrders = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
        product: serializeProduct(item.product),
      })),
    }));

    return {
      success: true,
      data: serializedOrders,
    };
  } catch (error) {
    console.error("Error getting table orders:", error);
    return {
      success: false,
      error: "Error al obtener las órdenes",
    };
  }
}

// Add item to order
export async function addOrderItem(orderId: string, item: OrderItemInput) {
  try {
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
      },
      include: {
        product: true,
      },
    });

    // Convert Decimal to number
    const serializedItem = {
      ...orderItem,
      price: Number(orderItem.price),
      originalPrice: orderItem.originalPrice
        ? Number(orderItem.originalPrice)
        : null,
      product: serializeProduct(orderItem.product),
    };

    return {
      success: true,
      data: serializedItem,
    };
  } catch (error) {
    console.error("Error adding order item:", error);
    return {
      success: false,
      error: "Error al agregar el producto",
    };
  }
}

// Update order item price
export async function updateOrderItemPrice(itemId: string, price: number) {
  try {
    const item = await prisma.orderItem.update({
      where: { id: itemId },
      data: { price },
      include: {
        product: true,
      },
    });

    // Convert Decimal to number
    const serializedItem = {
      ...item,
      price: Number(item.price),
      originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
      product: serializeProduct(item.product),
    };

    return {
      success: true,
      data: serializedItem,
    };
  } catch (error) {
    console.error("Error updating order item price:", error);
    return {
      success: false,
      error: "Error al actualizar el precio",
    };
  }
}

// Update order item quantity
export async function updateOrderItemQuantity(
  itemId: string,
  quantity: number
) {
  try {
    // Validate quantity is positive
    if (quantity < 1) {
      return {
        success: false,
        error: "La cantidad debe ser mayor a 0",
      };
    }

    const item = await prisma.orderItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: true,
      },
    });

    // Convert Decimal to number
    const serializedItem = {
      ...item,
      price: Number(item.price),
      originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
      product: serializeProduct(item.product),
    };

    return {
      success: true,
      data: serializedItem,
    };
  } catch (error) {
    console.error("Error updating order item quantity:", error);
    return {
      success: false,
      error: "Error al actualizar la cantidad",
    };
  }
}

// Remove item from order
export async function removeOrderItem(itemId: string) {
  try {
    await prisma.orderItem.delete({
      where: { id: itemId },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error removing order item:", error);
    return {
      success: false,
      error: "Error al eliminar el producto",
    };
  }
}

// Update party size
export async function updatePartySize(orderId: string, partySize: number) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { partySize },
    });

    return {
      success: true,
      data: order,
    };
  } catch (error) {
    console.error("Error updating party size:", error);
    return {
      success: false,
      error: "Error al actualizar el número de comensales",
    };
  }
}

// Close table (mark order as completed)
export async function closeTable(orderId: string) {
  try {
    // Update order and check table status in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Mark order as completed
      const completedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
        },
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: {
              id: "asc",
            },
          },
          table: true,
        },
      });

      // Check if table has any other active orders
      if (completedOrder.tableId) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: completedOrder.tableId,
            status: {
              in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
            },
          },
        });

        // If no more active orders, clear table status
        if (activeOrders === 0) {
          await tx.table.update({
            where: { id: completedOrder.tableId },
            data: { status: "EMPTY" },
          });
        }
      }

      return completedOrder;
    });

    // Convert Decimal fields to numbers
    const serializedOrder = {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
        product: serializeProduct(item.product),
      })),
    };

    return {
      success: true,
      data: serializedOrder,
    };
  } catch (error) {
    console.error("Error closing table:", error);
    return {
      success: false,
      error: "Error al cerrar la mesa",
    };
  }
}

// Check if table has active orders
export async function tableHasActiveOrders(tableId: string) {
  try {
    const count = await prisma.order.count({
      where: {
        tableId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
        },
      },
    });

    return {
      success: true,
      hasActiveOrders: count > 0,
      count,
    };
  } catch (error) {
    console.error("Error checking table orders:", error);
    return {
      success: false,
      hasActiveOrders: false,
      count: 0,
    };
  }
}

// Get products available for ordering (branch-specific with prices)
export async function getAvailableProductsForOrder(branchId: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        branches: {
          some: {
            branchId,
            isActive: true,
          },
        },
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        branches: {
          where: {
            branchId,
          },
          include: {
            prices: {
              where: {
                type: "DINE_IN",
              },
            },
          },
        },
      },
      orderBy: [
        {
          category: {
            order: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
    });

    // Transform to include price directly and convert Decimal to number
    const productsWithPrice = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      category: product.category,
      price: Number(product.branches[0]?.prices[0]?.price ?? 0),
    }));

    return productsWithPrice;
  } catch (error) {
    console.error("Error getting available products:", error);
    return [];
  }
}
