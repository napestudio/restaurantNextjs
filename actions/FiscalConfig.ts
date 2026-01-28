"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

// ============================================================================
// TYPES & VALIDATION
// ============================================================================

const fiscalConfigSchema = z.object({
  // Fiscal identity
  businessName: z.string().min(1, "Razón social requerida"),
  cuit: z
    .string()
    .length(11, "CUIT debe tener 11 dígitos")
    .regex(/^\d+$/, "CUIT debe ser numérico"),
  address: z.string().optional().nullable(),
  activityStartDate: z.coerce.date().optional().nullable(),
  grossIncome: z.string().optional().nullable(),
  taxStatus: z
    .enum([
      "Responsable Inscripto",
      "Monotributo",
      "Exento",
      "No Responsable",
      "Consumidor Final",
    ])
    .optional()
    .nullable(),

  // AFIP credentials
  environment: z.enum(["test", "production"]),
  certificatePath: z.string().optional().nullable(),
  privateKeyPath: z.string().optional().nullable(),

  // Sales points
  defaultPtoVta: z.coerce.number().int().min(1).max(9999),

  // Invoice behavior
  defaultInvoiceType: z.coerce.number().int().refine(
    (val) => [1, 6, 11].includes(val),
    "Tipo de factura inválido"
  ),
  autoIssue: z.boolean().default(false),

  // Status
  isEnabled: z.boolean().default(false),
});

export type FiscalConfigInput = z.infer<typeof fiscalConfigSchema>;

// Extended type that includes read-only fields from database
export interface FiscalConfigData extends FiscalConfigInput {
  id?: string;
  restaurantId?: string;
  availablePtoVta?: number[] | null;
  lastSyncedAt?: Date | null;
  certificateExpiresAt?: Date | null;
  lastTestedAt?: Date | null;
  lastTestSuccess?: boolean | null;
  lastTestError?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// GET FISCAL CONFIGURATION
// ============================================================================

export async function getFiscalConfig(
  restaurantId: string
): Promise<ActionResult<FiscalConfigData | null>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const config = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId },
    });

    if (!config) {
      // Return null if no config exists yet
      return { success: true, data: null };
    }

    return { success: true, data: config as unknown as FiscalConfigData };
  } catch (error) {
    console.error("[getFiscalConfig] Error:", error);
    return {
      success: false,
      error: "Error al obtener configuración fiscal",
    };
  }
}

// ============================================================================
// UPDATE FISCAL CONFIGURATION
// ============================================================================

export async function updateFiscalConfig(
  restaurantId: string,
  data: FiscalConfigInput
): Promise<ActionResult> {
  try {
    // Check admin permissions
    const { userId } = await authorizeAction(
      UserRole.ADMIN,
      "No tienes permisos para modificar la configuración fiscal"
    );

    // Validate input
    const validation = fiscalConfigSchema.safeParse(data);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return {
        success: false,
        error: firstError?.message || "Datos inválidos",
      };
    }

    // Upsert fiscal configuration
    const updated = await prisma.fiscalConfiguration.upsert({
      where: { restaurantId },
      create: {
        ...validation.data,
        restaurantId,
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        ...validation.data,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/config/fiscal");

    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateFiscalConfig] Error:", error);
    return {
      success: false,
      error: "Error al guardar configuración fiscal",
    };
  }
}

// ============================================================================
// TEST FISCAL CONFIGURATION
// ============================================================================

export async function testFiscalConnection(
  restaurantId: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    // Get active config (DB or .env)
    const { getActiveArcaConfig } = await import("@/lib/arca-config");
    const arcaConfig = await getActiveArcaConfig(restaurantId);

    // Test ARCA connection
    const { testArcaConnection } = await import("@/actions/Arca");
    const result = await testArcaConnection();

    if (!result.success) {
      // Update last test result in DB
      await prisma.fiscalConfiguration.update({
        where: { restaurantId },
        data: {
          lastTestedAt: new Date(),
          lastTestSuccess: false,
          lastTestError: result.error,
        },
      });

      return { success: false, error: result.error };
    }

    // Update successful test result
    await prisma.fiscalConfiguration.update({
      where: { restaurantId },
      data: {
        lastTestedAt: new Date(),
        lastTestSuccess: true,
        lastTestError: null,
      },
    });

    return {
      success: true,
      data: { message: "Conexión exitosa con AFIP" },
    };
  } catch (error) {
    console.error("[testFiscalConnection] Error:", error);
    return {
      success: false,
      error: "Error al probar conexión con AFIP",
    };
  }
}

// ============================================================================
// SYNC SALES POINTS FROM AFIP
// ============================================================================

export async function syncSalesPoints(
  restaurantId: string
): Promise<ActionResult<number[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    // Get sales points from AFIP
    const { getSalesPoints } = await import("@/actions/Arca");
    const result = await getSalesPoints();

    if (!result.success) {
      return { success: false, error: result.error || "Error al obtener puntos de venta" };
    }

    if (!result.data) {
      return { success: false, error: "No se obtuvieron datos de puntos de venta" };
    }

    // Extract sales point numbers from AFIP response
    const ptoVentaArray = (result.data as any)?.resultGet?.ptoVenta;
    if (!Array.isArray(ptoVentaArray)) {
      return { success: false, error: "No se encontraron puntos de venta disponibles" };
    }

    const salesPoints = ptoVentaArray.map((sp: any) => sp.nro);

    // Update in database
    await prisma.fiscalConfiguration.update({
      where: { restaurantId },
      data: {
        availablePtoVta: salesPoints,
        lastSyncedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/config/fiscal");

    return { success: true, data: salesPoints };
  } catch (error) {
    console.error("[syncSalesPoints] Error:", error);
    return {
      success: false,
      error: "Error al sincronizar puntos de venta",
    };
  }
}
