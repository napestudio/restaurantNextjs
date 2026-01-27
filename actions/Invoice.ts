"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import type { InvoiceStatus, Prisma } from "@/app/generated/prisma";
import { authorizeAction } from "@/lib/permissions/middleware";
import { emitTestInvoice, getLastInvoiceNumber } from "./Arca";
import { generateAfipQrData, generateAfipQrUrl } from "@/lib/arca-qr";

// ============================================================================
// TYPES
// ============================================================================

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

interface CustomerInvoiceData {
  name: string;
  docType: number; // 80=CUIT, 96=DNI, 99=Consumidor Final
  docNumber: string; // "0" for Consumidor Final
}

interface VatBreakdownItem {
  rate: number;
  base: number;
  amount: number;
}

interface CalculatedTotals {
  subtotal: number;
  vatBreakdown: VatBreakdownItem[];
  totalVat: number;
  total: number;
}

interface AfipError {
  Code: string;
  Msg: string;
}

interface AfipResponseData {
  cae?: string;
  caeFchVto?: string;
  Errors?: AfipError[];
  [key: string]: unknown;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate customer document format
 */
function validateDocument(docType: number, docNumber: string): { valid: boolean; error?: string } {
  if (docType === 99) {
    // Consumidor Final must be "0"
    if (docNumber !== "0") {
      return { valid: false, error: "Consumidor Final debe tener documento '0'" };
    }
    return { valid: true };
  }

  if (docType === 96) {
    // DNI: 7-8 digits
    if (!/^\d{7,8}$/.test(docNumber)) {
      return { valid: false, error: "DNI debe tener 7 u 8 dígitos" };
    }
    return { valid: true };
  }

  if (docType === 80 || docType === 86) {
    // CUIT/CUIL: 11 digits
    if (!/^\d{11}$/.test(docNumber)) {
      return { valid: false, error: "CUIT/CUIL debe tener 11 dígitos" };
    }
    return { valid: true };
  }

  return { valid: false, error: "Tipo de documento inválido" };
}

/**
 * Validate invoice type compatibility with document type
 */
function validateInvoiceTypeCompatibility(invoiceType: number, docType: number): { valid: boolean; error?: string } {
  // Factura A requires CUIT
  if (invoiceType === 1 && docType !== 80) {
    return { valid: false, error: "Factura A requiere CUIT (tipo 80)" };
  }

  // Factura B accepts all document types
  if (invoiceType === 6) {
    return { valid: true };
  }

  // Factura C accepts all document types
  if (invoiceType === 11) {
    return { valid: true };
  }

  return { valid: true };
}

// ============================================================================
// VAT CALCULATION
// ============================================================================

/**
 * Calculate VAT breakdown from order items
 * Default: 21% VAT rate (most common in Argentina)
 * Assumes prices are VAT-inclusive (Factura B style)
 */
function calculateVatBreakdown(
  orderItems: Array<{ price: unknown; quantity: number }>,
  discountPercentage: unknown
): CalculatedTotals {
  const discount = Number(discountPercentage) || 0;

  // Calculate total from items
  let itemsTotal = 0;
  for (const item of orderItems) {
    const price = Number(item.price);
    const quantity = item.quantity;
    itemsTotal += price * quantity;
  }

  // Apply discount
  const discountedTotal = itemsTotal * (1 - discount / 100);

  // Extract VAT (21% inclusive)
  // Formula: net = total / 1.21, vat = total - net
  const netAmount = discountedTotal / 1.21;
  const vatAmount = discountedTotal - netAmount;

  const vatBreakdown: VatBreakdownItem[] = [{
    rate: 21,
    base: Math.round(netAmount * 100) / 100,
    amount: Math.round(vatAmount * 100) / 100,
  }];

  return {
    subtotal: Math.round(netAmount * 100) / 100,
    vatBreakdown,
    totalVat: Math.round(vatAmount * 100) / 100,
    total: Math.round(discountedTotal * 100) / 100,
  };
}

// ============================================================================
// AFIP PAYLOAD BUILDER
// ============================================================================

/**
 * Build AFIP invoice payload from order data
 */
interface OrderWithItems {
  id: string;
  discountPercentage: unknown;
  items: Array<{
    price: unknown;
    quantity: number;
    itemName: string;
  }>;
}

async function buildAfipInvoicePayload(
  order: OrderWithItems,
  invoiceType: number,
  customerData: CustomerInvoiceData,
  invoiceNumber: number,
  ptoVta: number,
  totals: CalculatedTotals
) {
  // Format date as YYYYMMDD
  const invoiceDate = new Date();
  const dateStr = invoiceDate.toISOString().split('T')[0].replace(/-/g, '');

  // Build payload
  const payload = {
    CantReg: 1,
    PtoVta: ptoVta,
    CbteTipo: invoiceType,
    Concepto: 1, // 1=Productos (restaurant sales)
    DocTipo: customerData.docType,
    DocNro: customerData.docNumber === "0" ? 0 : parseInt(customerData.docNumber),
    CbteDesde: invoiceNumber,
    CbteHasta: invoiceNumber,
    CbteFch: dateStr,
    ImpTotal: totals.total,
    ImpTotConc: 0, // Non-taxed amount
    ImpNeto: totals.subtotal,
    ImpOpEx: 0, // Exempt operations
    ImpTrib: 0, // Other taxes
    ImpIVA: totals.totalVat,
    MonId: "PES",
    MonCotiz: 1,
    FchServDesde: undefined,
    FchServHasta: undefined,
    FchVtoPago: undefined,

    // Customer condition: 5=Consumidor Final for Factura B
    CondicionIVAReceptorId: invoiceType === 1 ? 1 : 5,

    // VAT breakdown
    Iva: totals.vatBreakdown.map(vat => ({
      Id: 5, // 21% VAT
      BaseImp: vat.base,
      Importe: vat.amount,
    })),
  };

  return payload;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate AFIP invoice for an order
 *
 * Steps:
 * 1. Validate order is COMPLETED
 * 2. Check no existing EMITTED invoice
 * 3. Get next invoice number from AFIP
 * 4. Calculate VAT breakdown
 * 5. Build AFIP payload
 * 6. Call emitTestInvoice()
 * 7. Store invoice with CAE
 * 8. Generate QR URL
 */
export async function generateInvoiceForOrder(
  orderId: string,
  invoiceType: number,
  customerData: CustomerInvoiceData
): Promise<ActionResult<unknown>> {
  try {
    // Authorization check - only MANAGER and above can generate invoices
    const { userId } = await authorizeAction(UserRole.MANAGER);

    // Validate document
    const docValidation = validateDocument(customerData.docType, customerData.docNumber);
    if (!docValidation.valid) {
      return { success: false, error: docValidation.error! };
    }

    // Validate invoice type compatibility
    const typeValidation = validateInvoiceTypeCompatibility(invoiceType, customerData.docType);
    if (!typeValidation.valid) {
      return { success: false, error: typeValidation.error! };
    }

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoices: true,
        table: true,
      },
    });

    if (!order) {
      return { success: false, error: "Orden no encontrada" };
    }

    // Validate order status
    if (order.status !== "COMPLETED") {
      return { success: false, error: "La orden debe estar COMPLETADA para facturar" };
    }

    // Check for existing emitted invoice
    const existingInvoice = order.invoices.find(inv => inv.status === "EMITTED");
    if (existingInvoice) {
      return { success: false, error: "La orden ya tiene una factura emitida" };
    }

    // Get sales point from environment
    const ptoVta = parseInt(process.env.ARCA_PTO_VTA || "1");

    // Get next invoice number from AFIP
    const lastInvoiceResult = await getLastInvoiceNumber(ptoVta, invoiceType);
    if (!lastInvoiceResult.success) {
      return { success: false, error: "Error al obtener número de factura: " + lastInvoiceResult.error };
    }

    const nextInvoiceNumber = (lastInvoiceResult.data?.cbteNro || 0) + 1;

    // Calculate VAT breakdown
    const totals = calculateVatBreakdown(order.items, order.discountPercentage);

    // Build AFIP payload
    const afipPayload = await buildAfipInvoicePayload(
      order,
      invoiceType,
      customerData,
      nextInvoiceNumber,
      ptoVta,
      totals
    );

    // Emit invoice to AFIP
    const afipResult = await emitTestInvoice(afipPayload);

    if (!afipResult.success) {
      // Save as FAILED status for retry later
      const failedInvoice = await prisma.invoice.create({
        data: {
          orderId: order.id,
          customerName: customerData.name,
          customerDocType: customerData.docType,
          customerDocNumber: customerData.docNumber,
          invoiceType,
          ptoVta,
          invoiceNumber: nextInvoiceNumber,
          invoiceDate: new Date(),
          subtotal: totals.subtotal,
          vatAmount: totals.totalVat,
          totalAmount: totals.total,
          vatBreakdown: totals.vatBreakdown as unknown as Prisma.InputJsonValue,
          status: "FAILED",
          afipResponse: { error: afipResult.error } as unknown as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

      return { success: false, error: "AFIP rechazó la factura: " + afipResult.error };
    }

    // Check for AFIP errors
    const afipData = afipResult.data as AfipResponseData;
    if ('Errors' in afipData && afipData.Errors && afipData.Errors.length > 0) {
      const errorMsg = afipData.Errors.map((e) => `[${e.Code}] ${e.Msg}`).join(", ");

      const failedInvoice = await prisma.invoice.create({
        data: {
          orderId: order.id,
          customerName: customerData.name,
          customerDocType: customerData.docType,
          customerDocNumber: customerData.docNumber,
          invoiceType,
          ptoVta,
          invoiceNumber: nextInvoiceNumber,
          invoiceDate: new Date(),
          subtotal: totals.subtotal,
          vatAmount: totals.totalVat,
          totalAmount: totals.total,
          vatBreakdown: totals.vatBreakdown as unknown as Prisma.InputJsonValue,
          status: "FAILED",
          afipResponse: afipData as unknown as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

      return { success: false, error: "Error AFIP: " + errorMsg };
    }

    // Success - extract CAE
    const cae = afipData.cae;
    const caeFchVto = afipData.caeFchVto;

    if (!cae) {
      return { success: false, error: "AFIP no devolvió CAE" };
    }

    // Generate QR URL
    const qrData = generateAfipQrData({
      cuit: parseInt(process.env.ARCA_CUIT || "0"),
      ptoVta,
      tipoCmp: invoiceType,
      nroCmp: nextInvoiceNumber,
      fecha: afipPayload.CbteFch,
      importe: totals.total,
      moneda: "PES",
      tipoDocRec: customerData.docType,
      nroDocRec: customerData.docNumber === "0" ? 0 : parseInt(customerData.docNumber),
      cae,
    });

    const qrUrl = generateAfipQrUrl(qrData);

    // Save invoice with CAE
    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        customerName: customerData.name,
        customerDocType: customerData.docType,
        customerDocNumber: customerData.docNumber,
        invoiceType,
        ptoVta,
        invoiceNumber: nextInvoiceNumber,
        invoiceDate: new Date(),
        subtotal: totals.subtotal,
        vatAmount: totals.totalVat,
        totalAmount: totals.total,
        vatBreakdown: totals.vatBreakdown as unknown as Prisma.InputJsonValue,
        cae,
        caeFchVto,
        qrUrl,
        status: "EMITTED",
        afipResponse: afipData as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    // Serialize Decimal fields for client components
    const serializedInvoice = {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
    };

    return { success: true, data: serializedInvoice };
  } catch (error) {
    console.error("[generateInvoiceForOrder] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al generar factura",
    };
  }
}

/**
 * Get invoices for branch with filters
 */
export async function getInvoices(params: {
  branchId: string;
  page?: number;
  pageSize?: number;
  invoiceType?: number;
  status?: InvoiceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}): Promise<ActionResult<{ invoices: unknown[]; pagination: PaginationInfo }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Build filters
    type WhereFilter = {
      order: { branchId: string };
      invoiceType?: number;
      status?: InvoiceStatus;
      invoiceDate?: { gte?: Date; lte?: Date };
      OR?: Array<{ customerName?: { contains: string; mode: 'insensitive' } } | { cae?: { contains: string } } | { invoiceNumber?: number }>;
    };

    const where: WhereFilter = {
      order: {
        branchId: params.branchId,
      },
    };

    if (params.invoiceType) {
      where.invoiceType = params.invoiceType;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.dateFrom || params.dateTo) {
      where.invoiceDate = {};
      if (params.dateFrom) {
        where.invoiceDate.gte = params.dateFrom;
      }
      if (params.dateTo) {
        where.invoiceDate.lte = params.dateTo;
      }
    }

    if (params.search) {
      const searchNumber = parseInt(params.search);
      where.OR = [
        { customerName: { contains: params.search, mode: "insensitive" } },
        { cae: { contains: params.search } },
      ];

      // If search is a valid number, also search by invoice number
      if (!isNaN(searchNumber)) {
        where.OR.push({ invoiceNumber: searchNumber });
      }
    }

    // Get total count
    const totalCount = await prisma.invoice.count({ where });

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            publicCode: true,
          },
        },
      },
      orderBy: {
        invoiceDate: "desc",
      },
      skip,
      take: pageSize,
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    // Serialize Decimal fields for client components
    const serializedInvoices = invoices.map((invoice) => ({
      ...invoice,
      subtotal: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
    }));

    return {
      success: true,
      data: {
        invoices: serializedInvoices,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount,
        },
      },
    };
  } catch (error) {
    console.error("[getInvoices] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener facturas",
    };
  }
}

/**
 * Get invoice by ID with order details
 */
export async function getInvoiceById(invoiceId: string): Promise<ActionResult<unknown>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: true,
            table: true,
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Factura no encontrada" };
    }

    // Serialize Decimal fields for client components
    const serializedInvoice = {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
      order: invoice.order
        ? {
            ...invoice.order,
            discountPercentage: Number(invoice.order.discountPercentage),
            items: invoice.order.items.map((item) => ({
              ...item,
              price: Number(item.price),
              originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
            })),
          }
        : null,
    };

    return { success: true, data: serializedInvoice };
  } catch (error) {
    console.error("[getInvoiceById] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener factura",
    };
  }
}
