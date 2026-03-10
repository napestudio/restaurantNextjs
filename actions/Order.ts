"use server";

import prisma from "@/lib/prisma";
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  UserRole,
  InvoiceStatus,
  type Product,
} from "@/app/generated/prisma";
import { serializeClient } from "@/lib/serializers";
import { serializeForClient } from "@/lib/serialize";
import { todayBoundsARDate, dateStringToTimestampBoundsAR } from "@/lib/date-utils";
import { authorizeAction } from "@/lib/permissions/middleware";
import type {
  DeliverySection,
  DeliveryElement,
  DeliveryProduct,
  OrderProduct,
} from "@/types/products";

// ============================================================================
// Helper Functions (internal, not exported)
// ============================================================================

/**
 * Validate table for order creation
 * Returns table data if valid, or error object if invalid
 */
async function validateTableForOrder(
  tableId: string,
  type: OrderType,
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
async function getClientDiscount(
  clientId: string | null | undefined,
): Promise<number> {
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

import type {
  OrderItemInput,
  OrderFilters,
  PaymentMethodExtended,
  PaymentEntry,
  OrderWithoutInvoice,
} from "@/types/orders";
export type {
  OrderItemInput,
  OrderFilters,
  PaymentMethodExtended,
  PaymentEntry,
  OrderWithoutInvoice,
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
              sectorId: true,
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

    return {
      success: true,
      data: serializeForClient(order),
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
  deliveryFee?: number;
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
      deliveryFee,
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
          deliveryFee: deliveryFee ?? 0,
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
              sectorId: true,
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

    return {
      success: true,
      data: serializeForClient(order),
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
  assignedToId?: string | null,
) {
  try {
    // Validate table for order
    const tableValidation = await validateTableForOrder(
      tableId,
      OrderType.DINE_IN,
    );
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
        invoices: {
          select: {
            id: true,
            status: true,
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
          deliveryFee: Number(order.deliveryFee),
          items: order.items.map((item) => ({
            ...item,
            price: Number(item.price),
            originalPrice: item.originalPrice
              ? Number(item.originalPrice)
              : null,
            product: serializeProduct(item.product),
          })),
          invoices: order.invoices || [],
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
        invoices: {
          select: {
            id: true,
            status: true,
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
      deliveryFee: Number(order.deliveryFee),
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
        product: serializeProduct(item.product),
      })),
      invoices: order.invoices || [],
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

// Add multiple items to order (bulk operation)
export async function addOrderItems(
  orderId: string,
  items: OrderItemInput[],
) {
  try {
    // Single transaction for all items - much faster than sequential calls
    const result = await prisma.orderItem.createMany({
      data: items.map((item) => ({
        orderId,
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        notes: item.notes || null,
      })),
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error adding order items:", error);
    return {
      success: false,
      error: "Error al agregar los productos",
    };
  }
}

// Update order item price
export async function updateOrderItemPrice(itemId: string, price: number) {
  try {
    // Authorization check - only MANAGER and above can modify order prices
    await authorizeAction(
      UserRole.MANAGER,
      "Solo gerentes y superiores pueden modificar precios",
    );

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
  quantity: number,
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
  notes: string | null,
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
          "No se puede eliminar una orden con productos. Use el cierre de mesa normal.",
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
      error: error instanceof Error ? error.message : "Error al cerrar la mesa",
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
  orderType: OrderType = OrderType.DINE_IN,
) {
  try {
    // Build price type filter: fetch requested type + DINE_IN for fallback
    const priceTypes = orderType === OrderType.DINE_IN
      ? [OrderType.DINE_IN]
      : [orderType, OrderType.DINE_IN];

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
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        categoryId: true,
        tags: true,
        trackStock: true,
        category: {
          select: {
            name: true,
          },
        },
        branches: {
          where: {
            branchId,
          },
          select: {
            stock: true,
            prices: {
              where: {
                type: {
                  in: priceTypes, // Only fetch needed price types
                },
              },
              select: {
                price: true,
                type: true,
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
    const productsWithPrice = products.map((product) => {
      const branchPrices = product.branches[0]?.prices || [];

      // Try to find price matching orderType
      let priceObj = branchPrices.find((p) => p.type === orderType);

      // Fallback to DINE_IN if orderType price not found
      if (!priceObj && orderType !== OrderType.DINE_IN) {
        priceObj = branchPrices.find((p) => p.type === OrderType.DINE_IN);
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        tags: product.tags,
        category: product.category,
        price: Number(priceObj?.price ?? 0),
        trackStock: product.trackStock,
        stock: Number(product.branches[0]?.stock ?? 0),
      };
    }).filter((p) => !p.trackStock || p.stock > 0);

    return productsWithPrice;
  } catch (error) {
    console.error("Error getting available products:", error);
    return [];
  }
}

// Get products for a specific delivery menu, organised by menu sections and groups.
// Returns both the section structure (for display) and a flat deduped product list
// (for cart stock lookups).
export async function getProductsForDeliveryMenu(
  branchId: string,
  menuId: string,
  orderType: OrderType = OrderType.DELIVERY,
): Promise<{ sections: DeliverySection[]; products: OrderProduct[] }> {
  try {
    const priceTypes =
      orderType === OrderType.DINE_IN
        ? [OrderType.DINE_IN]
        : [orderType, OrderType.DINE_IN];

    const productSelect = {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      categoryId: true,
      tags: true,
      trackStock: true,
      category: { select: { name: true } },
      branches: {
        where: { branchId },
        select: {
          stock: true,
          prices: {
            where: { type: { in: priceTypes } },
            select: { price: true, type: true },
          },
        },
      },
    };

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: {
        menuSections: {
          orderBy: { order: "asc" },
          include: {
            menuItems: {
              where: { isAvailable: true },
              orderBy: { order: "asc" },
              include: { product: { select: productSelect } },
            },
            menuItemGroups: {
              orderBy: { order: "asc" },
              include: {
                menuItems: {
                  where: { isAvailable: true },
                  orderBy: { order: "asc" },
                  include: { product: { select: productSelect } },
                },
              },
            },
          },
        },
      },
    });

    if (!menu) return { sections: [], products: [] };

    const resolvePrice = (
      rawProduct: (typeof menu.menuSections)[0]["menuItems"][0]["product"],
    ): DeliveryProduct => {
      const branchPrices = rawProduct.branches[0]?.prices || [];
      let priceObj = branchPrices.find((p) => p.type === orderType);
      if (!priceObj && orderType !== OrderType.DINE_IN) {
        priceObj = branchPrices.find((p) => p.type === OrderType.DINE_IN);
      }
      return {
        productId: rawProduct.id,
        name: rawProduct.name,
        description: rawProduct.description,
        imageUrl: rawProduct.imageUrl,
        price: Number(priceObj?.price ?? 0),
        tags: rawProduct.tags,
        trackStock: rawProduct.trackStock,
        stock: Number(rawProduct.branches[0]?.stock ?? 0),
        isFeatured: false, // overridden per-item below
      };
    };

    // Build section structure
    const sections: DeliverySection[] = menu.menuSections.map((section) => {
      const elements: DeliveryElement[] = [];

      // Direct (ungrouped) items — filter by menuItemGroupId is null at DB level
      // but Prisma returns all menuItems; group items are excluded via menuItemGroupId
      for (const item of section.menuItems.filter(
        (i) => i.menuItemGroupId === null,
      )) {
        const dp: DeliveryProduct = {
          ...resolvePrice(item.product),
          isFeatured: item.isFeatured,
        };
        if (!item.product.trackStock || dp.stock > 0) {
          elements.push({ type: "item", order: item.order, data: dp });
        }
      }

      // Groups
      for (const group of section.menuItemGroups) {
        const groupItems: DeliveryProduct[] = group.menuItems
          .map((item) => ({
            ...resolvePrice(item.product),
            isFeatured: item.isFeatured,
          }))
          .filter((dp) => !dp.trackStock || dp.stock > 0);

        if (groupItems.length > 0) {
          elements.push({
            type: "group",
            order: group.order,
            data: {
              id: group.id,
              name: group.name,
              description: group.description,
              order: group.order,
              items: groupItems,
            },
          });
        }
      }

      elements.sort((a, b) => a.order - b.order);

      return {
        id: section.id,
        name: section.name,
        description: section.description,
        order: section.order,
        elements,
      };
    });

    // Derive a flat, deduped OrderProduct list for cart stock lookups
    const seen = new Set<string>();
    const products: OrderProduct[] = [];
    for (const section of sections) {
      for (const element of section.elements) {
        const items =
          element.type === "item" ? [element.data] : element.data.items;
        for (const dp of items) {
          if (!seen.has(dp.productId)) {
            seen.add(dp.productId);
            products.push({
              id: dp.productId,
              name: dp.name,
              description: dp.description,
              imageUrl: dp.imageUrl,
              categoryId: null,
              category: null,
              price: dp.price,
              tags: dp.tags,
              trackStock: dp.trackStock,
              stock: dp.stock,
            });
          }
        }
      }
    }

    return { sections, products };
  } catch (error) {
    console.error("Error getting delivery menu products:", error);
    return { sections: [], products: [] };
  }
}

// Get available tables to move an order to
// Only returns tables that are free (EMPTY status) and not reserved
export async function getAvailableTablesForMove(branchId: string) {
  try {
    const { start: today, end: tomorrow } = todayBoundsARDate();

    const tables = await prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
        OR: [
          { status: "EMPTY" },
          { status: null }, // Tables with no manual status override
          {
            AND: [{ isShared: true }, { status: "OCCUPIED" }],
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
      paymentMethod,
      search,
      page = 1,
      pageSize = 10,
      sortOrder = "desc",
    } = filters;

    // Build where clause
    type WhereClause = {
      branchId: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
        lt?: Date;
      };
      status?: OrderStatus;
      tableId?: string;
      type?: OrderType;
      paymentMethod?: PaymentMethod;
      publicCode?: {
        contains: string;
        mode: "insensitive";
      };
    };

    const where: WhereClause = {
      branchId,
    };

    // Date range filter — dates come in as UTC midnight from date pickers;
    // use Argentina-aware boundaries (midnight AR = 03:00 UTC)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const { start } = dateStringToTimestampBoundsAR(startDate.toISOString().slice(0, 10));
        where.createdAt.gte = start;
      }
      if (endDate) {
        const { end } = dateStringToTimestampBoundsAR(endDate.toISOString().slice(0, 10));
        where.createdAt.lt = end;
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

    // Payment method filter
    if (paymentMethod) {
      where.paymentMethod = paymentMethod as PaymentMethod;
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
              sectorId: true,
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
          invoices: {
            select: {
              id: true,
              status: true,
              // Removed: cae, invoiceNumber, invoiceDate - not needed in order list
              // Full invoice details loaded only when viewing specific order
            },
            // Removed orderBy - reduces query complexity, order list only needs existence/status
          },
          cashMovements: {
            where: { type: "SALE" },
            select: {
              paymentMethod: true,
              amount: true,
            },
          },
        },
        orderBy: {
          createdAt: sortOrder,
        },
        skip,
        take: pageSize,
      }),
    ]);

    // Serialize Decimal fields to numbers
    const serializedOrders = orders.map((order) => ({
      ...order,
      discountPercentage: Number(order.discountPercentage),
      deliveryFee: Number(order.deliveryFee),
      client: order.client ? serializeClient(order.client) : null,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
      })),
      invoices: order.invoices || [],
      cashMovements: order.cashMovements.map((m) => ({
        paymentMethod: m.paymentMethod,
        amount: Number(m.amount),
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
  paymentMethod: PaymentMethod,
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
  discountPercentage: number,
) {
  try {
    // Authorization check - only MANAGER and above can apply discounts
    await authorizeAction(
      UserRole.MANAGER,
      "Solo gerentes y superiores pueden aplicar descuentos",
    );

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

// Update delivery fee for a delivery order
export async function updateDeliveryFee(orderId: string, fee: number) {
  try {
    if (fee < 0) {
      return {
        success: false,
        error: "El costo de envío no puede ser negativo",
      };
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { deliveryFee: fee },
    });

    return {
      success: true,
      data: {
        ...order,
        deliveryFee: Number(order.deliveryFee),
        discountPercentage: Number(order.discountPercentage),
      },
    };
  } catch (error) {
    console.error("Error updating delivery fee:", error);
    return {
      success: false,
      error: "Error al actualizar el costo de envío",
    };
  }
}

// Assign staff to order
export async function assignStaffToOrder(
  orderId: string,
  userId: string | null,
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
    // Prevent manual status change to COMPLETED
    // COMPLETED status should only be set via closeTableWithPayment()
    if (status === OrderStatus.COMPLETED) {
      return {
        success: false,
        error: "No se puede marcar como completada manualmente. Use 'Finalizar Venta' para registrar el pago.",
      };
    }

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
  clientId: string | null,
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

// DEPRECATED: Old invoice functions have been replaced by ARCA-compliant invoice system
// See actions/Invoice.ts for the new implementation:
// - generateInvoiceForOrder() - Generates ARCA electronic invoices with CAE
// - getInvoices() - Lists invoices with pagination and filters
// - getInvoiceById() - Gets a single invoice with full details


// Close table with payment - records payment in cash register
export async function closeTableWithPayment(data: {
  orderId: string;
  payments: PaymentEntry[];
  sessionId: string;
  isPartialClose?: boolean;
}) {
  try {
    const { userId } = await authorizeAction(UserRole.MANAGER);
    const { orderId, payments, sessionId, isPartialClose } = data;

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
        0,
      );
      const discountAmount =
        subtotal * (Number(order.discountPercentage) / 100);
      const deliveryFeeAmount = Number(order.deliveryFee);
      const total = subtotal - discountAmount + deliveryFeeAmount;

      // Validate payments array - allow empty if total is $0
      if ((!payments || payments.length === 0) && total > 0.01) {
        throw new Error("At least one payment method is required");
      }

      // Validate payment amounts match total
      const totalPayment = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Reject only if payment is less than total (allow overpayment / change)
      if (totalPayment < total - 0.01) {
        throw new Error(
          `El pago ($${totalPayment.toFixed(
            2,
          )}) es menor al total de la orden ($${total.toFixed(2)})`,
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
              description: `Mesa ${order.table?.number || "S/N"} - Orden ${
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
      const primaryPayment =
        payments && payments.length > 0
          ? payments.reduce((max, p) => (p.amount > max.amount ? p : max))
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
        case "PAYMENT_LINK":
          orderPaymentMethod = PaymentMethod.PAYMENT_LINK;
          break;
        case "QR_CODE":
          orderPaymentMethod = PaymentMethod.QR_CODE;
          break;
        default:
          orderPaymentMethod = PaymentMethod.CASH;
      }

      const previousTableId = order.tableId;

      // Update order status and payment method
      const completedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: isPartialClose
            ? OrderStatus.IN_PROGRESS
            : OrderStatus.COMPLETED,
          paymentMethod: orderPaymentMethod,
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
      deliveryFee: Number(result.deliveryFee),
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

// ============================================================================
// Invoice-related Order Queries
// ============================================================================

/**
 * Order without invoice (for invoice creation)
 */

import type { ActionResult } from "@/types/action-result";

/**
 * Get completed orders without emitted invoices
 * Used for invoice creation dialog
 */
export async function getOrdersWithoutInvoice(params: {
  branchId: string;
  search?: string;
  limit?: number;
}): Promise<ActionResult<OrderWithoutInvoice[]>> {
  try {
    const { branchId, search, limit = 20 } = params;

    // Build where clause conditionally
    const whereClause: {
      branchId: string;
      status: OrderStatus;
      invoices: { none: { status: InvoiceStatus } };
      OR?: Array<{
        publicCode?: { contains: string; mode: "insensitive" };
        customerName?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      branchId,
      status: OrderStatus.COMPLETED,
      invoices: {
        none: {
          status: InvoiceStatus.EMITTED,
        },
      },
    };

    // Only add OR clause if search is provided
    if (search && search.trim()) {
      whereClause.OR = [
        { publicCode: { contains: search.trim(), mode: "insensitive" } },
        { customerName: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          select: { quantity: true, price: true },
        },
        table: {
          select: { name: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Calculate totals and serialize
    const ordersWithTotal: OrderWithoutInvoice[] = orders.map((order) => ({
      id: order.id,
      publicCode: order.publicCode,
      customerName: order.customerName,
      table: order.table,
      type: order.type,
      total: order.items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      ),
    }));

    return {
      success: true,
      data: ordersWithTotal,
    };
  } catch (error) {
    console.error("Error getting orders without invoice:", error);
    return {
      success: false,
      error: "Error al obtener pedidos sin factura",
    };
  }
}

// ============================================================================
// Active Order Counts (for tab badges)
// ============================================================================

/**
 * Get count of active orders by type
 * Used for displaying badges on order type tabs
 */
// Change order type between TAKE_AWAY and DELIVERY
// Recalculates item prices and adjusts delivery fee accordingly
export async function updateOrderType(
  orderId: string,
  newType: OrderType,
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction(
      UserRole.MANAGER,
      "Solo gerentes y superiores pueden cambiar el tipo de orden",
    );

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        branchId: true,
        type: true,
        status: true,
        items: {
          select: { id: true, productId: true },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Orden no encontrada" };
    }
    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELED
    ) {
      return {
        success: false,
        error: "No se puede cambiar el tipo de una orden finalizada",
      };
    }
    if (order.type === newType) {
      return { success: false, error: "La orden ya es de ese tipo" };
    }
    if (
      order.type === OrderType.DINE_IN ||
      newType === OrderType.DINE_IN
    ) {
      return {
        success: false,
        error: "Solo se puede cambiar entre Para Llevar y Delivery",
      };
    }

    // Build price map for items that have a productId
    const productIds = order.items
      .filter((item) => item.productId)
      .map((item) => item.productId!);

    const priceMap: Record<string, number> = {};

    if (productIds.length > 0) {
      const pobs = await prisma.productOnBranch.findMany({
        where: {
          branchId: order.branchId,
          productId: { in: productIds },
        },
        select: {
          productId: true,
          prices: {
            where: {
              type: {
                in: [newType, OrderType.DINE_IN] as never[],
              },
            },
            select: { price: true, type: true },
          },
        },
      });

      for (const pob of pobs) {
        // Prefer the new type price, fall back to DINE_IN
        const priceObj =
          pob.prices.find((p) => p.type === (newType as string)) ??
          pob.prices.find((p) => p.type === OrderType.DINE_IN);
        if (priceObj) {
          priceMap[pob.productId] = Number(priceObj.price);
        }
      }
    }

    // Auto-apply delivery fee from config when switching TO delivery
    let newDeliveryFee = 0;
    if (newType === OrderType.DELIVERY) {
      const config = await prisma.deliveryConfig.findUnique({
        where: { branchId: order.branchId },
        select: { deliveryFee: true },
      });
      newDeliveryFee = Number(config?.deliveryFee ?? 0);
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { type: newType, deliveryFee: newDeliveryFee },
      });

      for (const item of order.items) {
        if (item.productId && priceMap[item.productId] !== undefined) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { price: priceMap[item.productId] },
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating order type:", error);
    return { success: false, error: "Error al cambiar el tipo de orden" };
  }
}

export async function getActiveOrderCounts(branchId: string) {
  try {
    const counts = await prisma.order.groupBy({
      by: ["type"],
      where: {
        branchId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS],
        },
      },
      _count: {
        id: true,
      },
    });

    return {
      DINE_IN: counts.find((c) => c.type === OrderType.DINE_IN)?._count.id ?? 0,
      TAKE_AWAY:
        counts.find((c) => c.type === OrderType.TAKE_AWAY)?._count.id ?? 0,
      DELIVERY:
        counts.find((c) => c.type === OrderType.DELIVERY)?._count.id ?? 0,
    };
  } catch (error) {
    console.error("Error getting active order counts:", error);
    return {
      DINE_IN: 0,
      TAKE_AWAY: 0,
      DELIVERY: 0,
    };
  }
}
