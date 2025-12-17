"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { Prisma } from "@/app/generated/prisma";
import { serializeForClient } from "@/lib/serialize";

// =============================================================================
// SCHEMAS
// =============================================================================

const createCashRegisterSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  branchId: z.string().min(1, "La sucursal es requerida"),
  sectorId: z.string().optional().nullable(),
});

const updateCashRegisterSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  sectorId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const openSessionSchema = z.object({
  cashRegisterId: z.string().min(1, "La caja es requerida"),
  openingAmount: z.number().min(0, "El monto inicial no puede ser negativo"),
  userId: z.string().min(1, "El usuario es requerido"),
});

const closeSessionSchema = z.object({
  sessionId: z.string().min(1, "La sesión es requerida"),
  countedCash: z.number().min(0, "El efectivo contado no puede ser negativo"),
  closingNotes: z.string().optional(),
  userId: z.string().min(1, "El usuario es requerido"),
});

const addMovementSchema = z.object({
  sessionId: z.string().min(1, "La sesión es requerida"),
  type: z.enum(["INCOME", "EXPENSE", "SALE", "REFUND"]),
  paymentMethod: z.enum([
    "CASH",
    "CARD_DEBIT",
    "CARD_CREDIT",
    "ACCOUNT",
    "TRANSFER",
  ]),
  amount: z.number().positive("El monto debe ser positivo"),
  description: z.string().optional(),
  orderId: z.string().optional().nullable(),
  userId: z.string().min(1, "El usuario es requerido"),
});

// =============================================================================
// CASH REGISTER CRUD
// =============================================================================

export async function createCashRegister(
  data: z.infer<typeof createCashRegisterSchema>
) {
  try {
    const validatedData = createCashRegisterSchema.parse(data);

    // Check if cash register name already exists in this branch
    const existingRegister = await prisma.cashRegister.findUnique({
      where: {
        branchId_name: {
          branchId: validatedData.branchId,
          name: validatedData.name,
        },
      },
    });

    if (existingRegister) {
      return {
        success: false,
        error: "Ya existe una caja con ese nombre en esta sucursal",
      };
    }

    const cashRegister = await prisma.cashRegister.create({
      data: {
        name: validatedData.name,
        branchId: validatedData.branchId,
        sectorId: validatedData.sectorId || null,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/config/cash-registers");

    return {
      success: true,
      data: cashRegister,
    };
  } catch (error) {
    console.error("Error creating cash register:", error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    return {
      success: false,
      error: "Error al crear la caja",
    };
  }
}

export async function getCashRegistersByBranch(branchId: string) {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      where: {
        branchId,
      },
      include: {
        sector: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        sessions: {
          where: {
            status: "OPEN",
          },
          take: 1,
          orderBy: {
            openedAt: "desc",
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      data: cashRegisters,
    };
  } catch (error) {
    console.error("Error fetching cash registers:", error);
    return {
      success: false,
      error: "Error al obtener las cajas",
      data: [],
    };
  }
}

export async function getCashRegisterById(id: string) {
  try {
    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id },
      include: {
        sector: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        sessions: {
          where: {
            status: "OPEN",
          },
          take: 1,
          include: {
            movements: {
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
            },
          },
        },
      },
    });

    if (!cashRegister) {
      return {
        success: false,
        error: "Caja no encontrada",
      };
    }

    return {
      success: true,
      data: cashRegister,
    };
  } catch (error) {
    console.error("Error fetching cash register:", error);
    return {
      success: false,
      error: "Error al obtener la caja",
    };
  }
}

export async function updateCashRegister(
  id: string,
  data: z.infer<typeof updateCashRegisterSchema>
) {
  try {
    const validatedData = updateCashRegisterSchema.parse(data);

    // If updating name, check for duplicates
    if (validatedData.name) {
      const existingRegister = await prisma.cashRegister.findFirst({
        where: {
          id: { not: id },
          name: validatedData.name,
          branch: {
            cashRegisters: {
              some: { id },
            },
          },
        },
      });

      if (existingRegister) {
        return {
          success: false,
          error: "Ya existe una caja con ese nombre en esta sucursal",
        };
      }
    }

    const cashRegister = await prisma.cashRegister.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.sectorId !== undefined && {
          sectorId: validatedData.sectorId,
        }),
        ...(validatedData.isActive !== undefined && {
          isActive: validatedData.isActive,
        }),
      },
    });

    revalidatePath("/dashboard/config/cash-registers");

    return {
      success: true,
      data: cashRegister,
    };
  } catch (error) {
    console.error("Error updating cash register:", error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    return {
      success: false,
      error: "Error al actualizar la caja",
    };
  }
}

export async function deleteCashRegister(id: string) {
  try {
    // Check if register has open sessions
    const register = await prisma.cashRegister.findUnique({
      where: { id },
      include: {
        sessions: {
          where: {
            status: "OPEN",
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!register) {
      return {
        success: false,
        error: "Caja no encontrada",
      };
    }

    if (register.sessions.length > 0) {
      return {
        success: false,
        error: "No se puede eliminar una caja con sesiones abiertas",
      };
    }

    // If has historical sessions, soft delete
    if (register._count.sessions > 0) {
      await prisma.cashRegister.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // No sessions, can hard delete
      await prisma.cashRegister.delete({
        where: { id },
      });
    }

    revalidatePath("/dashboard/config/cash-registers");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting cash register:", error);
    return {
      success: false,
      error: "Error al eliminar la caja",
    };
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export async function openCashRegisterSession(
  data: z.infer<typeof openSessionSchema>
) {
  try {
    const validatedData = openSessionSchema.parse(data);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Check if there's already an open session for this register
      const existingSession = await tx.cashRegisterSession.findFirst({
        where: {
          cashRegisterId: validatedData.cashRegisterId,
          status: "OPEN",
        },
      });

      if (existingSession) {
        throw new Error("Esta caja ya tiene una sesión abierta");
      }

      // Check if the register exists and is active
      const register = await tx.cashRegister.findUnique({
        where: { id: validatedData.cashRegisterId },
      });

      if (!register) {
        throw new Error("Caja no encontrada");
      }

      if (!register.isActive) {
        throw new Error("Esta caja está desactivada");
      }

      // Create new session
      const session = await tx.cashRegisterSession.create({
        data: {
          cashRegisterId: validatedData.cashRegisterId,
          openedBy: validatedData.userId,
          openingAmount: new Prisma.Decimal(validatedData.openingAmount),
          status: "OPEN",
        },
      });

      return session;
    });

    revalidatePath("/dashboard/config/cash-registers");
    revalidatePath("/dashboard/cash-registers");

    return {
      success: true,
      data: serializeForClient(result),
    };
  } catch (error) {
    console.error("Error opening cash register session:", error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error al abrir la sesión de caja",
    };
  }
}

export async function closeCashRegisterSession(
  data: z.infer<typeof closeSessionSchema>
) {
  try {
    const validatedData = closeSessionSchema.parse(data);

    const result = await prisma.$transaction(async (tx) => {
      // Get the session
      const session = await tx.cashRegisterSession.findUnique({
        where: { id: validatedData.sessionId },
        include: {
          movements: true,
        },
      });

      if (!session) {
        throw new Error("Sesión no encontrada");
      }

      if (session.status === "CLOSED") {
        throw new Error("Esta sesión ya está cerrada");
      }

      // Calculate expected cash
      // Start with opening amount
      let expectedCash = Number(session.openingAmount);

      // Add/subtract only CASH movements
      for (const movement of session.movements) {
        if (movement.paymentMethod === "CASH") {
          const amount = Number(movement.amount);
          if (movement.type === "INCOME" || movement.type === "SALE") {
            expectedCash += amount;
          } else if (movement.type === "EXPENSE" || movement.type === "REFUND") {
            expectedCash -= amount;
          }
        }
      }

      // Calculate variance
      const variance = validatedData.countedCash - expectedCash;

      // Update session
      const updatedSession = await tx.cashRegisterSession.update({
        where: { id: validatedData.sessionId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedBy: validatedData.userId,
          expectedCash: new Prisma.Decimal(expectedCash),
          countedCash: new Prisma.Decimal(validatedData.countedCash),
          variance: new Prisma.Decimal(variance),
          closingNotes: validatedData.closingNotes || null,
        },
      });

      return updatedSession;
    });

    revalidatePath("/dashboard/config/cash-registers");
    revalidatePath("/dashboard/cash-registers");

    return {
      success: true,
      data: serializeForClient(result),
    };
  } catch (error) {
    console.error("Error closing cash register session:", error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error al cerrar la sesión de caja",
    };
  }
}

export async function getCurrentSession(cashRegisterId: string) {
  try {
    const session = await prisma.cashRegisterSession.findFirst({
      where: {
        cashRegisterId,
        status: "OPEN",
      },
      include: {
        movements: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return {
      success: true,
      data: serializeForClient(session),
    };
  } catch (error) {
    console.error("Error fetching current session:", error);
    return {
      success: false,
      error: "Error al obtener la sesión actual",
    };
  }
}

export async function getSessionHistory(
  cashRegisterId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  try {
    const sessions = await prisma.cashRegisterSession.findMany({
      where: {
        cashRegisterId,
      },
      include: {
        _count: {
          select: {
            movements: true,
          },
        },
      },
      orderBy: {
        openedAt: "desc",
      },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });

    const total = await prisma.cashRegisterSession.count({
      where: { cashRegisterId },
    });

    return {
      success: true,
      data: serializeForClient(sessions),
      total,
    };
  } catch (error) {
    console.error("Error fetching session history:", error);
    return {
      success: false,
      error: "Error al obtener el historial de sesiones",
      data: [],
      total: 0,
    };
  }
}

// =============================================================================
// MOVEMENT OPERATIONS
// =============================================================================

export async function addManualMovement(
  data: z.infer<typeof addMovementSchema>
) {
  try {
    const validatedData = addMovementSchema.parse(data);

    const result = await prisma.$transaction(async (tx) => {
      // Verify session exists and is open
      const session = await tx.cashRegisterSession.findUnique({
        where: { id: validatedData.sessionId },
      });

      if (!session) {
        throw new Error("Sesión no encontrada");
      }

      if (session.status === "CLOSED") {
        throw new Error("No se pueden agregar movimientos a una sesión cerrada");
      }

      // Create movement
      const movement = await tx.cashMovement.create({
        data: {
          sessionId: validatedData.sessionId,
          type: validatedData.type,
          paymentMethod: validatedData.paymentMethod,
          amount: new Prisma.Decimal(validatedData.amount),
          description: validatedData.description || null,
          orderId: validatedData.orderId || null,
          createdBy: validatedData.userId,
        },
      });

      return movement;
    });

    revalidatePath("/dashboard/config/cash-registers");
    revalidatePath("/dashboard/cash-registers");

    return {
      success: true,
      data: serializeForClient(result),
    };
  } catch (error) {
    console.error("Error adding movement:", error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error al agregar el movimiento",
    };
  }
}

export async function recordSaleFromOrder(data: {
  sessionId: string;
  orderId: string;
  paymentMethod:
    | "CASH"
    | "CARD_DEBIT"
    | "CARD_CREDIT"
    | "ACCOUNT"
    | "TRANSFER";
  amount: number;
  userId: string;
}) {
  return addManualMovement({
    ...data,
    type: "SALE",
    description: `Venta - Orden`,
  });
}

export async function recordRefund(data: {
  sessionId: string;
  orderId: string;
  paymentMethod:
    | "CASH"
    | "CARD_DEBIT"
    | "CARD_CREDIT"
    | "ACCOUNT"
    | "TRANSFER";
  amount: number;
  reason: string;
  userId: string;
}) {
  return addManualMovement({
    sessionId: data.sessionId,
    orderId: data.orderId,
    paymentMethod: data.paymentMethod,
    amount: data.amount,
    type: "REFUND",
    description: `Devolución: ${data.reason}`,
    userId: data.userId,
  });
}

export async function getSessionMovements(sessionId: string) {
  try {
    const movements = await prisma.cashMovement.findMany({
      where: { sessionId },
      include: {
        order: {
          select: {
            id: true,
            publicCode: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: serializeForClient(movements),
    };
  } catch (error) {
    console.error("Error fetching session movements:", error);
    return {
      success: false,
      error: "Error al obtener los movimientos",
      data: [],
    };
  }
}

// =============================================================================
// REPORTS & CALCULATIONS
// =============================================================================

export async function getSessionSummary(sessionId: string) {
  try {
    const session = await prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: {
        movements: true,
      },
    });

    if (!session) {
      return {
        success: false,
        error: "Sesión no encontrada",
      };
    }

    // Calculate totals by payment method
    const totalsByPaymentMethod: Record<
      string,
      { income: number; expense: number; net: number }
    > = {};

    // Calculate totals by type
    const totalsByType: Record<string, number> = {
      INCOME: 0,
      EXPENSE: 0,
      SALE: 0,
      REFUND: 0,
    };

    for (const movement of session.movements) {
      const amount = Number(movement.amount);
      const method = movement.paymentMethod;
      const type = movement.type;

      // Initialize if not exists
      if (!totalsByPaymentMethod[method]) {
        totalsByPaymentMethod[method] = { income: 0, expense: 0, net: 0 };
      }

      // Update payment method totals
      if (type === "INCOME" || type === "SALE") {
        totalsByPaymentMethod[method].income += amount;
        totalsByPaymentMethod[method].net += amount;
      } else {
        totalsByPaymentMethod[method].expense += amount;
        totalsByPaymentMethod[method].net -= amount;
      }

      // Update type totals
      totalsByType[type] += amount;
    }

    // Calculate expected cash
    const expectedCash =
      Number(session.openingAmount) +
      (totalsByPaymentMethod["CASH"]?.net || 0);

    return {
      success: true,
      data: {
        openingAmount: Number(session.openingAmount),
        expectedCash,
        countedCash: session.countedCash ? Number(session.countedCash) : null,
        variance: session.variance ? Number(session.variance) : null,
        totalsByPaymentMethod,
        totalsByType,
        movementCount: session.movements.length,
      },
    };
  } catch (error) {
    console.error("Error calculating session summary:", error);
    return {
      success: false,
      error: "Error al calcular el resumen de la sesión",
    };
  }
}

export async function calculateExpectedCash(sessionId: string) {
  try {
    const session = await prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: {
        movements: {
          where: {
            paymentMethod: "CASH",
          },
        },
      },
    });

    if (!session) {
      return {
        success: false,
        error: "Sesión no encontrada",
      };
    }

    let expectedCash = Number(session.openingAmount);

    for (const movement of session.movements) {
      const amount = Number(movement.amount);
      if (movement.type === "INCOME" || movement.type === "SALE") {
        expectedCash += amount;
      } else if (movement.type === "EXPENSE" || movement.type === "REFUND") {
        expectedCash -= amount;
      }
    }

    return {
      success: true,
      data: expectedCash,
    };
  } catch (error) {
    console.error("Error calculating expected cash:", error);
    return {
      success: false,
      error: "Error al calcular el efectivo esperado",
    };
  }
}

// Get manual movements (INCOME/EXPENSE only, not SALE/REFUND from orders) with date filters
export async function getManualMovements(params: {
  branchId: string;
  dateFrom?: string;
  dateTo?: string;
  cashRegisterId?: string;
  type?: "INCOME" | "EXPENSE";
  limit?: number;
  offset?: number;
}) {
  try {
    const { branchId, dateFrom, dateTo, cashRegisterId, type, limit = 50, offset = 0 } = params;

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
      dateFilter.gte.setHours(0, 0, 0, 0);
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo);
      dateFilter.lte.setHours(23, 59, 59, 999);
    }

    const whereClause = {
      // Only manual movements (INCOME/EXPENSE), not SALE/REFUND from orders
      type: type ? type : { in: ["INCOME", "EXPENSE"] as const },
      // Filter by branch through session -> cashRegister
      session: {
        cashRegister: {
          branchId,
          ...(cashRegisterId && { id: cashRegisterId }),
        },
      },
      // Date filter
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    // Get total count and movements in parallel
    const [movements, total] = await Promise.all([
      prisma.cashMovement.findMany({
        where: whereClause,
        include: {
          session: {
            include: {
              cashRegister: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.cashMovement.count({ where: whereClause }),
    ]);

    // Serialize for client
    const serializedMovements = movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      paymentMethod: movement.paymentMethod,
      amount: Number(movement.amount),
      description: movement.description,
      createdAt: movement.createdAt.toISOString(),
      createdBy: movement.createdBy,
      sessionId: movement.sessionId,
      cashRegister: movement.session.cashRegister,
    }));

    return {
      success: true,
      data: serializedMovements,
      total,
      hasMore: offset + movements.length < total,
    };
  } catch (error) {
    console.error("Error fetching manual movements:", error);
    return {
      success: false,
      error: "Error al obtener los movimientos",
      data: [],
      total: 0,
      hasMore: false,
    };
  }
}

// Get a single movement by ID
export async function getMovementById(movementId: string) {
  try {
    const movement = await prisma.cashMovement.findUnique({
      where: { id: movementId },
      include: {
        session: {
          include: {
            cashRegister: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            publicCode: true,
            type: true,
          },
        },
      },
    });

    if (!movement) {
      return {
        success: false,
        error: "Movimiento no encontrado",
      };
    }

    return {
      success: true,
      data: {
        id: movement.id,
        type: movement.type,
        paymentMethod: movement.paymentMethod,
        amount: Number(movement.amount),
        description: movement.description,
        createdAt: movement.createdAt.toISOString(),
        createdBy: movement.createdBy,
        sessionId: movement.sessionId,
        orderId: movement.orderId,
        cashRegister: movement.session.cashRegister,
        order: movement.order,
      },
    };
  } catch (error) {
    console.error("Error fetching movement:", error);
    return {
      success: false,
      error: "Error al obtener el movimiento",
    };
  }
}

// Get cash registers with open sessions for a branch
export async function getOpenCashRegistersForBranch(branchId: string) {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      where: {
        branchId,
        isActive: true,
        sessions: {
          some: {
            status: "OPEN",
          },
        },
      },
      include: {
        sector: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        sessions: {
          where: {
            status: "OPEN",
          },
          take: 1,
          orderBy: {
            openedAt: "desc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform to include session directly
    const registersWithSession = cashRegisters.map((register) => ({
      id: register.id,
      name: register.name,
      sector: register.sector,
      session: register.sessions[0]
        ? {
            id: register.sessions[0].id,
            openedAt: register.sessions[0].openedAt.toISOString(),
            openingAmount: Number(register.sessions[0].openingAmount),
          }
        : null,
    }));

    return {
      success: true,
      data: registersWithSession,
    };
  } catch (error) {
    console.error("Error fetching open cash registers:", error);
    return {
      success: false,
      error: "Error al obtener las cajas abiertas",
      data: [],
    };
  }
}
