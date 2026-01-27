"use server";

import prisma from "@/lib/prisma";
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  UserRole,
  type Product,
} from "@/app/generated/prisma";
import { serializeClient } from "@/lib/serializers";
import { authorizeAction } from "@/lib/permissions/middleware";

// ============================================================================
// Helper Functions (internal, not exported)
// ============================================================================

/**
 * Validate table for order creation
 * Returns table data if valid, or error object if invalid
 */
async function validateTableForOrder(
  tableId: string,
  type: OrderType
): Promise<
  | { success: true; table: { isShared: boolean; isActive: boolean } }
  | { success: false; error: string }
> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { isShared: true, isActive: true },
  });

  if (!table) {
    return { success: false, error: "Mesa no encontrada" };
  }

  if (!table.isActive) {
    return { success: false, error: "Mesa no activa" };
  }

  // Check if table already has an active order (only for non-shared tables with DINE_IN)
  if (!table.isShared && type === OrderType.DINE_IN) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        tableId,
        status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
      },
    });

    if (existingOrder) {
      return { success: false, error: "Esta mesa ya tiene una orden activa" };
    }
  }

  return { success: true, table };
}

/**
 * Get client discount percentage
 * Returns 0 if client not found or no discount set
 */
async function getClientDiscount(clientId: string | null | undefined): Promise<number> {
  if (!clientId) return 0;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { discountPercentage: true },
  });

  return client?.discountPercentage ? Number(client.discountPercentage) : 0;
}

// ============================================================================
// Types
// ============================================================================

export type OrderItemInput = {
  productId: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number;
  notes?: string;
};

// Helper to serialize product (convert Decimal fields to numbers)
function serializeProduct(product: Product | null) {
  if (!product) return null;
  return {
    ...product,
    minStockAlert: product.minStockAlert ? Number(product.minStockAlert) : null,
  };
}

// Create a new order (any type)
export async function createOrder(data: {
  branchId: string;
  type: OrderType;
  tableId?: string | null;
  partySize?: number | null;
  clientId?: string | null;
  assignedToId?: string | null;
  description?: string | null;
}) {
  try {
    const {
      branchId,
      type,
      tableId,
      partySize,
      clientId,
      assignedToId,
      description,
    } = data;

    // Validation based on order type
    if (type === OrderType.DINE_IN && !tableId) {
      return {
        success: false,
        error: "Se requiere una mesa para órdenes para comer aquí",
      };
    }

    if (type === OrderType.DELIVERY && !clientId) {
      return {
        success: false,
        error: "Se requiere un cliente para órdenes de delivery",
      };
    }

    // Validate table for DINE_IN orders
    if (tableId) {
      const tableValidation = await validateTableForOrder(tableId, type);
      if (!tableValidation.success) {
        return { success: false, error: tableValidation.error };
      }
    }

    // Generate a unique public code
    const publicCode = `${type.charAt(0)}${Date.now().toString().slice(-8)}`;

    // Get client discount if clientId is provided
    const clientDiscount = await getClientDiscount(clientId);

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          branchId,
          tableId: tableId || null,
          partySize: partySize || null,
          type,
          publicCode,
          status: OrderStatus.PENDING,
          clientId: clientId || null,
          assignedToId: assignedToId || null,
          discountPercentage: clientDiscount,
          description: description || null,
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
          client: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          table: {
            select: {
              number: true,
              name: true,
            },
          },
        },
      });

      // Update table status to OCCUPIED if it's a dine-in order
      if (tableId && type === OrderType.DINE_IN) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: "OCCUPIED" },
        });
      }

      return newOrder;
    });

    // Serialize Decimal fields
    const serializedOrder = {
      ...order,
      discountPercentage: Number(order.discountPercentage),
      client: order.client ? serializeClient(order.client) : null,
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
    console.error("Error creating order:", error);
    return {
      success: false,
      error: "Error al crear la orden",
    };
  }
}

// Create a new order with items in a single transaction (bulk insert)
export async function createOrderWithItems(data: {
  branchId: string;
  type: OrderType;
  tableId?: string | null;
  partySize?: number | null;
  clientId?: string | null;
  assignedToId?: string | null;
  description?: string | null;
  items: OrderItemInput[];
}) {
  try {
    const {
      branchId,
      type,
      tableId,
      partySize,
      clientId,
      assignedToId,
      description,
      items,
    } = data;

    // Validation: at least one item required
    if (!items || items.length === 0) {
      return {
        success: false,
        error: "Se requiere al menos un producto",
      };
    }

    // Validation based on order type
    if (type === OrderType.DINE_IN && !tableId) {
      return {
        success: false,
        error: "Se requiere una mesa para órdenes para comer aquí",
      };
    }

    if (type === OrderType.DELIVERY && !clientId) {
      return {
        success: false,
        error: "Se requiere un cliente para órdenes de delivery",
      };
    }

    // Validate table for DINE_IN orders
    if (tableId) {
      const tableValidation = await validateTableForOrder(tableId, type);
      if (!tableValidation.success) {
        return { success: false, error: tableValidation.error };
      }
    }

    // Generate a unique public code
    const publicCode = `${type.charAt(0)}${Date.now().toString().slice(-8)}`;

    // Get client discount if clientId is provided
    const clientDiscount = await getClientDiscount(clientId);

    // Create order and items in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          branchId,
          tableId: tableId || null,
          partySize: partySize || null,
          type,
          publicCode,
          status: OrderStatus.PENDING,
          clientId: clientId || null,
          assignedToId: assignedToId || null,
          discountPercentage: clientDiscount,
          description: description || null,
        },
      });

      // Bulk create all order items
      await tx.orderItem.createMany({
        data: items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          itemName: item.itemName,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.originalPrice,
          notes: item.notes || null,
        })),
      });

      // Update table status to OCCUPIED if it's a dine-in order
      if (tableId && type === OrderType.DINE_IN) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: "OCCUPIED" },
        });
      }

      // Fetch the complete order with items
      const completeOrder = await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: {
              id: "asc",
            },
          },
          client: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          table: {
            select: {
              number: true,
              name: true,
            },
          },
        },
      });

      return completeOrder;
    });

    if (!order) {
      return {
        success: false,
        error: "Error al crear la orden",
      };
    }

    // Serialize Decimal fields
    const serializedOrder = {
      ...order,
      discountPercentage: Number(order.discountPercentage),
      client: order.client ? serializeClient(order.client) : null,
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
    console.error("Error creating order with items:", error);
    return {
      success: false,
      error: "Error al crear la orden",
    };
  }
}

// Create a new dine-in order for a table
export async function createTableOrder(
  tableId: string,
  branchId: string,
  partySize: number,
  clientId?: string | null,
  assignedToId?: string | null
) {
  try {
    // Validate table for order
    const tableValidation = await validateTableForOrder(tableId, OrderType.DINE_IN);
    if (!tableValidation.success) {
      return { success: false, error: tableValidation.error };
    }

    // Generate a unique public code
    const publicCode = `KS${Date.now().toString().slice(-8)}`;

    // Get client discount if clientId is provided
    const clientDiscount = await getClientDiscount(clientId);

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
          clientId: clientId || null,
          assignedToId: assignedToId || null,
          discountPercentage: clientDiscount,
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
          client: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
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
      discountPercentage: Number(order.discountPercentage),
      client: order.client ? serializeClient(order.client) : null,
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
        client: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            username: true,
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
          discountPercentage: Number(order.discountPercentage),
          items: order.items.map((item) => ({
            ...item,
            price: Number(item.price),
            originalPrice: item.originalPrice
              ? Number(item.originalPrice)
              : null,
            product: serializeProduct(item.product),
          })),
          client: order.client
            ? {
                id: order.client.id,
                name: order.client.name,
                email: order.client.email,
              }
            : null,
          assignedTo: order.assignedTo
            ? {
                id: order.assignedTo.id,
                name: order.assignedTo.name,
                username: order.assignedTo.username,
              }
            : null,
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
        client: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            username: true,
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
      discountPercentage: Number(order.discountPercentage),
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
        product: serializeProduct(item.product),
      })),
      client: order.client
        ? {
            id: order.client.id,
            name: order.client.name,
            email: order.client.email,
          }
        : null,
      assignedTo: order.assignedTo
        ? {
            id: order.assignedTo.id,
            name: order.assignedTo.name,
            username: order.assignedTo.username,
          }
        : null,
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
        notes: item.notes || null,
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
    // Authorization check - only MANAGER and above can modify order prices
    await authorizeAction(UserRole.MANAGER, "Solo gerentes y superiores pueden modificar precios");

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

// Update order item notes
export async function updateOrderItemNotes(
  itemId: string,
  notes: string | null
) {
  try {
    const item = await prisma.orderItem.update({
      where: { id: itemId },
      data: { notes },
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
    console.error("Error updating order item notes:", error);
    return {
      success: false,
      error: "Error al actualizar las notas",
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
      data: {
        ...order,
        discountPercentage: Number(order.discountPercentage),
      },
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
      // First, get the order to check its tableId
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { tableId: true },
      });

      const previousTableId = existingOrder?.tableId;

      // Mark order as completed and clear tableId
      const completedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
          tableId: null, // Clear table association when order is completed
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
      if (previousTableId) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: previousTableId,
            status: {
              in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
            },
          },
        });

        // If no more active orders, clear table status
        if (activeOrders === 0) {
          await tx.table.update({
            where: { id: previousTableId },
            data: { status: "EMPTY" },
          });
        }
      }

      return completedOrder;
    });

    // Convert Decimal fields to numbers
    const serializedOrder = {
      ...order,
      discountPercentage: Number(order.discountPercentage),
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

// Close table by deleting an empty order (no items)
export async function closeEmptyTable(orderId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get the order with its items count
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });

      if (!order) {
        throw new Error("Orden no encontrada");
      }

      // Verify order has no items
      if (order._count.items > 0) {
        throw new Error(
          "No se puede eliminar una orden con productos. Use el cierre de mesa normal."
        );
      }

      const previousTableId = order.tableId;

      // Delete the empty order
      await tx.order.delete({
        where: { id: orderId },
      });

      // Check if table has any other active orders and set to EMPTY if not
      if (previousTableId) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: previousTableId,
            status: {
              in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
            },
          },
        });

        if (activeOrders === 0) {
          await tx.table.update({
            where: { id: previousTableId },
            data: { status: "EMPTY" },
          });
        }
      }

      return { tableId: previousTableId };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error closing empty table:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al cerrar la mesa",
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
export async function getAvailableProductsForOrder(
  branchId: string,
  orderType: OrderType = OrderType.DINE_IN
) {
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
            prices: true,  // Fetch all price types for fallback logic
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
    const productsWithPrice = products.map((product) => {
      const branchPrices = product.branches[0]?.prices || [];

      // Try to find price matching orderType
      let priceObj = branchPrices.find((p) => p.type === orderType);

      // Fallback to DINE_IN if orderType price not found
      if (!priceObj && orderType !== "DINE_IN") {
        priceObj = branchPrices.find((p) => p.type === "DINE_IN");
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        category: product.category,
        price: Number(priceObj?.price ?? 0),
      };
    });

    return productsWithPrice;
  } catch (error) {
    console.error("Error getting available products:", error);
    return [];
  }
}

// Get available tables to move an order to
// Only returns tables that are free (EMPTY status) and not reserved
export async function getAvailableTablesForMove(branchId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tables = await prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
        OR: [
          { status: "EMPTY" },
          { status: null }, // Tables with no manual status override
          {
            AND: [
              { isShared: true },
              { status: "OCCUPIED" }
            ]
          }, // Include occupied shared tables
        ],
      },
      include: {
        reservations: {
          where: {
            reservation: {
              date: {
                gte: today,
                lt: tomorrow,
              },
              status: {
                in: ["CONFIRMED", "SEATED"],
              },
            },
          },
          include: {
            reservation: {
              include: {
                timeSlot: true,
              },
            },
          },
        },
        orders: {
          where: {
            status: {
              in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
            },
          },
        },
      },
      orderBy: {
        number: "asc",
      },
    });

    // Filter out tables that have active orders or are currently reserved
    const now = new Date();
    const availableTables = tables.filter((table) => {
      // Non-shared tables must not have active orders
      // Shared tables can have multiple active orders
      if (!table.isShared && table.orders.length > 0) {
        return false;
      }

      // Table must not have active reservations for current time
      const hasActiveReservation = table.reservations.some((rt) => {
        const reservation = rt.reservation;
        if (!reservation.timeSlot) return false;

        const timeSlotStart = new Date(reservation.timeSlot.startTime);
        const timeSlotEnd = new Date(reservation.timeSlot.endTime);

        const startHour = timeSlotStart.getUTCHours();
        const startMinute = timeSlotStart.getUTCMinutes();
        const endHour = timeSlotEnd.getUTCHours();
        const endMinute = timeSlotEnd.getUTCMinutes();

        const reservationDate = new Date(reservation.date);
        const startTime = new Date(reservationDate);
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(reservationDate);
        endTime.setHours(endHour, endMinute, 0, 0);

        return now >= startTime && now <= endTime;
      });

      return !hasActiveReservation;
    });

    // Return simplified table data
    return availableTables.map((table) => ({
      id: table.id,
      number: table.number,
      name: table.name,
      capacity: table.capacity,
      isShared: table.isShared,
      sectorId: table.sectorId,
    }));
  } catch (error) {
    console.error("Error getting available tables for move:", error);
    return [];
  }
}

// Move an order to a different table
export async function moveOrderToTable(orderId: string, targetTableId: string) {
  try {
    // Validate the order exists and is active
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELED
    ) {
      return {
        success: false,
        error: "No se puede mover una orden completada o cancelada",
      };
    }

    if (!order.tableId) {
      return {
        success: false,
        error: "Esta orden no está asignada a ninguna mesa",
      };
    }

    if (order.tableId === targetTableId) {
      return {
        success: false,
        error: "La orden ya está en esta mesa",
      };
    }

    // Validate target table exists and is available
    const targetTable = await prisma.table.findUnique({
      where: { id: targetTableId },
      include: {
        orders: {
          where: {
            status: {
              in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
            },
          },
        },
      },
    });

    if (!targetTable) {
      return {
        success: false,
        error: "Mesa de destino no encontrada",
      };
    }

    if (!targetTable.isActive) {
      return {
        success: false,
        error: "Mesa de destino no está activa",
      };
    }

    // For non-shared tables, check if it already has an active order
    if (!targetTable.isShared && targetTable.orders.length > 0) {
      return {
        success: false,
        error: "La mesa de destino ya tiene una orden activa",
      };
    }

    const sourceTableId = order.tableId;

    // Move order in a transaction
    await prisma.$transaction(async (tx) => {
      // Update order to new table
      await tx.order.update({
        where: { id: orderId },
        data: { tableId: targetTableId },
      });

      // Update target table status to OCCUPIED
      await tx.table.update({
        where: { id: targetTableId },
        data: { status: "OCCUPIED" },
      });

      // Check if source table has any other active orders
      const remainingOrders = await tx.order.count({
        where: {
          tableId: sourceTableId,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
          },
        },
      });

      // If no more active orders on source table, set it to EMPTY
      if (remainingOrders === 0) {
        await tx.table.update({
          where: { id: sourceTableId },
          data: { status: "EMPTY" },
        });
      }
    });

    return {
      success: true,
      data: {
        orderId,
        sourceTableId,
        targetTableId,
      },
    };
  } catch (error) {
    console.error("Error moving order to table:", error);
    return {
      success: false,
      error: "Error al mover la orden",
    };
  }
}

// Filters for getting orders
export type OrderFilters = {
  branchId: string;
  startDate?: Date;
  endDate?: Date;
  status?: OrderStatus;
  tableId?: string;
  type?: OrderType;
  // Search
  search?: string;
  // Pagination
  page?: number;
  pageSize?: number;
};

// Get orders with filters and pagination
export async function getOrders(filters: OrderFilters) {
  try {
    const {
      branchId,
      startDate,
      endDate,
      status,
      tableId,
      type,
      search,
      page = 1,
      pageSize = 10,
    } = filters;

    // Build where clause
    type WhereClause = {
      branchId: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
      status?: OrderStatus;
      tableId?: string;
      type?: OrderType;
      publicCode?: {
        contains: string;
        mode: "insensitive";
      };
    };

    const where: WhereClause = {
      branchId,
    };

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        // Set to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Table filter
    if (tableId) {
      where.tableId = tableId;
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Search filter (by public code)
    if (search) {
      where.publicCode = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Use transaction to get both count and data
    const [totalCount, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          table: {
            select: {
              number: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  categoryId: true,
                },
              },
            },
            orderBy: {
              id: "asc",
            },
          },
          client: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
      }),
    ]);

    // Serialize Decimal fields to numbers
    const serializedOrders = orders.map((order) => ({
      ...order,
      discountPercentage: Number(order.discountPercentage),
      client: order.client ? serializeClient(order.client) : null,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
      })),
    }));

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: serializedOrders,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error getting orders:", error);
    return {
      success: false,
      error: "Error al obtener las órdenes",
      data: [],
      pagination: {
        page: 1,
        pageSize: 15,
        totalCount: 0,
        totalPages: 0,
      },
    };
  }
}

// Update payment method
export async function updatePaymentMethod(
  orderId: string,
  paymentMethod: PaymentMethod
) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod },
    });

    return {
      success: true,
      data: {
        ...order,
        discountPercentage: Number(order.discountPercentage),
      },
    };
  } catch (error) {
    console.error("Error updating payment method:", error);
    return {
      success: false,
      error: "Error al actualizar el método de pago",
    };
  }
}

// Update discount percentage
export async function updateDiscount(
  orderId: string,
  discountPercentage: number
) {
  try {
    // Authorization check - only MANAGER and above can apply discounts
    await authorizeAction(UserRole.MANAGER, "Solo gerentes y superiores pueden aplicar descuentos");

    // Validate discount percentage (0-100)
    if (discountPercentage < 0 || discountPercentage > 100) {
      return {
        success: false,
        error: "El descuento debe estar entre 0 y 100",
      };
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { discountPercentage },
    });

    return {
      success: true,
      data: {
        ...order,
        discountPercentage: Number(order.discountPercentage),
      },
    };
  } catch (error) {
    console.error("Error updating discount:", error);
    return {
      success: false,
      error: "Error al actualizar el descuento",
    };
  }
}

// Assign staff to order
export async function assignStaffToOrder(
  orderId: string,
  userId: string | null
) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { assignedToId: userId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        ...order,
        discountPercentage: Number(order.discountPercentage),
      },
    };
  } catch (error) {
    console.error("Error assigning staff to order:", error);
    return {
      success: false,
      error: "Error al asignar personal a la orden",
    };
  }
}

// Update order status
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return {
      success: true,
      data: {
        ...order,
        discountPercentage: Number(order.discountPercentage),
      },
    };
  } catch (error) {
    console.error("Error updating order status:", error);
    return {
      success: false,
      error: "Error al actualizar el estado de la orden",
    };
  }
}

// Assign client to order
export async function assignClientToOrder(
  orderId: string,
  clientId: string | null
) {
  try {
    // Get client discount if clientId is provided
    const clientDiscount = await getClientDiscount(clientId);

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        clientId: clientId,
        discountPercentage: clientDiscount,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        ...order,
        discountPercentage: Number(order.discountPercentage),
      },
    };
  } catch (error) {
    console.error("Error assigning client to order:", error);
    return {
      success: false,
      error: "Error al asignar cliente a la orden",
    };
  }
}

// Mark order as needing invoice
export async function setNeedsInvoice(orderId: string, needsInvoice: boolean) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { needsInvoice },
    });

    return {
      success: true,
      data: {
        ...order,
        discountPercentage: Number(order.discountPercentage),
      },
    };
  } catch (error) {
    console.error("Error updating invoice flag:", error);
    return {
      success: false,
      error: "Error al actualizar la solicitud de factura",
    };
  }
}

// DEPRECATED: Old invoice functions have been replaced by AFIP-compliant invoice system
// See actions/Invoice.ts for the new implementation:
// - generateInvoiceForOrder() - Generates AFIP electronic invoices with CAE
// - getInvoices() - Lists invoices with pagination and filters
// - getInvoiceById() - Gets a single invoice with full details

// Payment method type for closing tables (extended)
export type PaymentMethodExtended =
  | "CASH"
  | "CARD_DEBIT"
  | "CARD_CREDIT"
  | "ACCOUNT"
  | "TRANSFER";

// Payment entry for split payments
export type PaymentEntry = {
  method: PaymentMethodExtended;
  amount: number;
};

// Close table with payment - records payment in cash register
export async function closeTableWithPayment(data: {
  orderId: string;
  payments: PaymentEntry[];
  sessionId: string;
  userId: string;
  isPartialClose?: boolean;
}) {
  try {
    const { orderId, payments, sessionId, userId, isPartialClose } = data;

    const result = await prisma.$transaction(async (tx) => {
      // Get the order with items and table
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          table: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status === OrderStatus.COMPLETED) {
        throw new Error("Order is already completed");
      }

      if (order.items.length === 0) {
        throw new Error("Cannot close an order without items");
      }

      // Validate session exists and is open
      const session = await tx.cashRegisterSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error("Cash register session not found");
      }

      if (session.status === "CLOSED") {
        throw new Error("Cannot add movements to a closed session");
      }

      // Calculate order total
      const subtotal = order.items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      );
      const discountAmount =
        subtotal * (Number(order.discountPercentage) / 100);
      const total = subtotal - discountAmount;

      // Validate payments array - allow empty if total is $0
      if ((!payments || payments.length === 0) && total > 0.01) {
        throw new Error("At least one payment method is required");
      }

      // Validate payment amounts match total
      const totalPayment = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Allow small rounding differences (0.01)
      if (Math.abs(totalPayment - total) > 0.01) {
        throw new Error(
          `Total ($${totalPayment.toFixed(
            2
          )}) no coincide con el total de la mesa ($${total.toFixed(2)})`
        );
      }

      // Create cash movements for each payment
      if (payments && payments.length > 0) {
        for (const payment of payments) {
          await tx.cashMovement.create({
            data: {
              sessionId,
              type: "SALE",
              paymentMethod: payment.method,
              amount: payment.amount,
              description: `Table ${order.table?.number || "N/A"} - Order ${
                order.publicCode
              }`,
              orderId: order.id,
              createdBy: userId,
            },
          });
        }
      }

      // Determine primary payment method for the order
      // Use the method with the highest amount, or default to CASH if no payments
      const primaryPayment = payments && payments.length > 0
        ? payments.reduce((max, p) => p.amount > max.amount ? p : max)
        : { method: "CASH" as const, amount: 0 };

      // Map extended payment method to Order's PaymentMethod enum
      let orderPaymentMethod: PaymentMethod;
      switch (primaryPayment.method) {
        case "CASH":
          orderPaymentMethod = PaymentMethod.CASH;
          break;
        case "CARD_DEBIT":
        case "CARD_CREDIT":
          orderPaymentMethod = PaymentMethod.CARD;
          break;
        case "TRANSFER":
        case "ACCOUNT":
          orderPaymentMethod = PaymentMethod.TRANSFER;
          break;
        default:
          orderPaymentMethod = PaymentMethod.CASH;
      }

      // Store tableId before clearing it
      const previousTableId = order.tableId;

      // Update order status and payment method
      const completedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: isPartialClose
            ? OrderStatus.IN_PROGRESS
            : OrderStatus.COMPLETED,
          paymentMethod: orderPaymentMethod,
          // Clear tableId when order is fully completed
          tableId: isPartialClose ? order.tableId : null,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          table: true,
        },
      });

      // If not partial close, check if table should be cleared
      if (!isPartialClose && previousTableId) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: previousTableId,
            status: {
              in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
            },
          },
        });

        // If no more active orders, clear table status
        if (activeOrders === 0) {
          await tx.table.update({
            where: { id: previousTableId },
            data: { status: "EMPTY" },
          });
        }
      }

      return completedOrder;
    });

    // Serialize for client
    const serializedOrder = {
      ...result,
      discountPercentage: Number(result.discountPercentage),
      items: result.items.map((item) => ({
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
    console.error("Error closing table with payment:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error closing the table",
    };
  }
}
