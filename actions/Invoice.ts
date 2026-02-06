"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, InvoiceStatus } from "@/app/generated/prisma";
import type { Prisma } from "@/app/generated/prisma";
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
function validateDocument(
  docType: number,
  docNumber: string,
): { valid: boolean; error?: string } {
  if (docType === 99) {
    // Consumidor Final must be "0"
    if (docNumber !== "0") {
      return {
        valid: false,
        error: "Consumidor Final debe tener documento '0'",
      };
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
function validateInvoiceTypeCompatibility(
  invoiceType: number,
  docType: number,
): { valid: boolean; error?: string } {
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
 *
 * For Factura C (Type 11): Returns zero VAT as these are IVA-exempt invoices
 */
function calculateVatBreakdown(
  orderItems: Array<{ price: unknown; quantity: number }>,
  discountPercentage: unknown,
  invoiceType: number,
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

  // Factura C (Type 11) is IVA-exempt - no VAT calculation
  if (invoiceType === 11) {
    return {
      subtotal: Math.round(discountedTotal * 100) / 100,
      vatBreakdown: [],
      totalVat: 0,
      total: Math.round(discountedTotal * 100) / 100,
    };
  }

  // Extract VAT (21% inclusive)
  // Formula: net = total / 1.21, vat = total - net
  const netAmount = discountedTotal / 1.21;
  const vatAmount = discountedTotal - netAmount;

  const vatBreakdown: VatBreakdownItem[] = [
    {
      rate: 21,
      base: Math.round(netAmount * 100) / 100,
      amount: Math.round(vatAmount * 100) / 100,
    },
  ];

  return {
    subtotal: Math.round(netAmount * 100) / 100,
    vatBreakdown,
    totalVat: Math.round(vatAmount * 100) / 100,
    total: Math.round(discountedTotal * 100) / 100,
  };
}

// ============================================================================
// ARCA PAYLOAD BUILDER
// ============================================================================

/**
 * Build ARCA invoice payload from order data
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
  totals: CalculatedTotals,
) {
  // Format date as YYYYMMDD
  const invoiceDate = new Date();
  const dateStr = invoiceDate.toISOString().split("T")[0].replace(/-/g, "");

  // Build payload
  const payload = {
    CantReg: 1,
    PtoVta: ptoVta,
    CbteTipo: invoiceType,
    Concepto: 1, // 1=Productos (restaurant sales)
    DocTipo: customerData.docType,
    DocNro:
      customerData.docNumber === "0" ? 0 : parseInt(customerData.docNumber),
    CbteDesde: invoiceNumber,
    CbteHasta: invoiceNumber,
    CbteFch: dateStr,
    ImpTotal: totals.total,
    ImpTotConc: 0, // Non-taxed amount
    ImpNeto: totals.subtotal,
    ImpOpEx: 0, // Exempt operations
    ImpTrib: 0, // Other taxes
    // Factura C (Type 11) must have ImpIVA = 0 (IVA-exempt)
    ImpIVA: invoiceType === 11 ? 0 : totals.totalVat,
    MonId: "PES",
    MonCotiz: 1,
    FchServDesde: undefined,
    FchServHasta: undefined,
    FchVtoPago: undefined,

    // Customer condition: 5=Consumidor Final for Factura B
    CondicionIVAReceptorId: invoiceType === 1 ? 1 : 5,

    // VAT breakdown - empty for Factura C (Type 11)
    Iva: invoiceType === 11 ? [] : totals.vatBreakdown.map((vat) => ({
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
 * Generate ARCA invoice for an order
 *
 * Steps:
 * 1. Validate order is COMPLETED
 * 2. Check no existing EMITTED invoice
 * 3. Get next invoice number from ARCA
 * 4. Calculate VAT breakdown
 * 5. Build ARCA payload
 * 6. Call emitTestInvoice()
 * 7. Store invoice with CAE
 * 8. Generate QR URL
 */
export async function generateInvoiceForOrder(
  orderId: string,
  invoiceType: number,
  customerData: CustomerInvoiceData,
): Promise<ActionResult<unknown>> {
  try {
    // Authorization check - only MANAGER and above can generate invoices
    const { userId } = await authorizeAction(UserRole.MANAGER);

    // Validate document
    const docValidation = validateDocument(
      customerData.docType,
      customerData.docNumber,
    );
    if (!docValidation.valid) {
      return { success: false, error: docValidation.error! };
    }

    // Validate invoice type compatibility
    const typeValidation = validateInvoiceTypeCompatibility(
      invoiceType,
      customerData.docType,
    );
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
        branch: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Orden no encontrada" };
    }

    // Validate order status
    if (order.status !== "COMPLETED") {
      return {
        success: false,
        error: "La orden debe estar COMPLETADA para facturar",
      };
    }

    // Check for existing emitted invoice
    const existingInvoice = order.invoices.find(
      (inv) => inv.status === "EMITTED",
    );
    if (existingInvoice) {
      return { success: false, error: "La orden ya tiene una factura emitida" };
    }

    // Get fiscal configuration (DB → .env fallback)
    const restaurantId = order.branch.restaurantId;
    const fiscalConfig = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId },
    });

    // Get sales point from DB config or fallback to environment
    const ptoVta =
      fiscalConfig?.isEnabled && fiscalConfig.defaultPtoVta
        ? fiscalConfig.defaultPtoVta
        : parseInt(process.env.ARCA_PTO_VTA || "1");

    // Get CUIT from DB config or fallback to environment
    const cuit =
      fiscalConfig?.isEnabled && fiscalConfig.cuit
        ? parseInt(fiscalConfig.cuit)
        : parseInt(process.env.ARCA_CUIT || "0");

    // Get next invoice number from ARCA
    const lastInvoiceResult = await getLastInvoiceNumber(ptoVta, invoiceType);
    if (!lastInvoiceResult.success) {
      return {
        success: false,
        error: "Error al obtener número de factura: " + lastInvoiceResult.error,
      };
    }

    const nextInvoiceNumber = (lastInvoiceResult.data?.cbteNro || 0) + 1;

    // Calculate VAT breakdown
    const totals = calculateVatBreakdown(order.items, order.discountPercentage, invoiceType);

    // Build ARCA payload
    const afipPayload = await buildAfipInvoicePayload(
      order,
      invoiceType,
      customerData,
      nextInvoiceNumber,
      ptoVta,
      totals,
    );

    // Emit invoice to ARCA
    const afipResult = await emitTestInvoice(afipPayload);

    if (!afipResult.success) {
      // Save as FAILED status for retry later
      await prisma.invoice.create({
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
          afipResponse: {
            error: afipResult.error,
          } as unknown as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

      return {
        success: false,
        error: "ARCA rechazó la factura: " + afipResult.error,
      };
    }

    // Check for ARCA errors
    const afipData = afipResult.data as AfipResponseData;
    if ("Errors" in afipData && afipData.Errors && afipData.Errors.length > 0) {
      const errorMsg = afipData.Errors.map((e) => `[${e.Code}] ${e.Msg}`).join(
        ", ",
      );

      await prisma.invoice.create({
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

      return { success: false, error: "Error ARCA: " + errorMsg };
    }

    // Success - extract CAE
    const cae = afipData.cae;
    const caeFchVto = afipData.caeFchVto;

    if (!cae) {
      return { success: false, error: "ARCA no devolvió CAE" };
    }

    // Generate QR URL
    const qrData = generateAfipQrData({
      cuit,
      ptoVta,
      tipoCmp: invoiceType,
      nroCmp: nextInvoiceNumber,
      fecha: afipPayload.CbteFch,
      importe: totals.total,
      moneda: "PES",
      tipoDocRec: customerData.docType,
      nroDocRec:
        customerData.docNumber === "0" ? 0 : parseInt(customerData.docNumber),
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
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al generar factura",
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
      OR?: Array<
        | { customerName?: { contains: string; mode: "insensitive" } }
        | { cae?: { contains: string } }
        | { invoiceNumber?: number }
      >;
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
      error:
        error instanceof Error ? error.message : "Error al obtener facturas",
    };
  }
}

/**
 * Get invoice by ID with order details
 */
export async function getInvoiceById(
  invoiceId: string,
): Promise<ActionResult<unknown>> {
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
              originalPrice: item.originalPrice
                ? Number(item.originalPrice)
                : null,
            })),
          }
        : null,
    };

    return { success: true, data: serializedInvoice };
  } catch (error) {
    console.error("[getInvoiceById] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al obtener factura",
    };
  }
}

/**
 * Generate PDF for an invoice
 * Returns downloadable PDF buffer
 */
export async function generateInvoicePDF(
  invoiceId: string,
): Promise<ActionResult<{ pdf: Buffer; filename: string }>> {
  try {
    await authorizeAction(UserRole.WAITER);

    // Get invoice with order details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: { select: { name: true } },
              },
            },
            table: true,
            branch: {
              include: { restaurant: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Factura no encontrada" };
    }

    if (invoice.status !== InvoiceStatus.EMITTED) {
      return {
        success: false,
        error: "Solo se pueden descargar facturas emitidas",
      };
    }

    // Manual invoices don't have order data - PDF generation not supported yet
    if (!invoice.order) {
      return {
        success: false,
        error:
          "La generación de PDF no está disponible para facturas manuales aún",
      };
    }

    // Get fiscal configuration
    const restaurantId = invoice.order.branch.restaurantId;
    const fiscalConfig = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId },
    });

    const businessName =
      fiscalConfig?.isEnabled && fiscalConfig.businessName
        ? fiscalConfig.businessName
        : process.env.BUSINESS_NAME || "Restaurant";
    const businessCuit =
      fiscalConfig?.isEnabled && fiscalConfig.cuit
        ? fiscalConfig.cuit
        : process.env.ARCA_CUIT || "";

    // Generate PDF using library
    const { generateInvoicePDF: pdfGenerator } =
      await import("@/lib/pdf/invoice-pdf");

    const pdfBuffer = await pdfGenerator({
      invoice: {
        number: invoice.invoiceNumber,
        type: invoice.invoiceType,
        date: invoice.invoiceDate,
        cae: invoice.cae || "",
        caeFchVto: invoice.caeFchVto || "",
        qrUrl: invoice.qrUrl || "",
      },
      business: {
        name: businessName,
        cuit: businessCuit,
      },
      customer: {
        name: invoice.customerName,
        docType: invoice.customerDocType,
        docNumber: invoice.customerDocNumber,
      },
      items: invoice.order.items.map((item) => ({
        description: item.itemName,
        quantity: item.quantity,
        unitPrice: Number(item.price),
        total: Number(item.price) * item.quantity,
      })),
      totals: {
        subtotal: Number(invoice.subtotal),
        vatAmount: Number(invoice.vatAmount),
        total: Number(invoice.totalAmount),
      },
      vatBreakdown: invoice.vatBreakdown as unknown,
    });

    const filename = `factura-${invoice.invoiceType}-${invoice.ptoVta}-${invoice.invoiceNumber}.pdf`;

    return {
      success: true,
      data: { pdf: pdfBuffer, filename },
    };
  } catch (error) {
    console.error("[generateInvoicePDF] Error:", error);
    return {
      success: false,
      error: "Error al generar PDF de factura",
    };
  }
}

// ============================================================================
// MANUAL INVOICE GENERATION
// ============================================================================

/**
 * Manual invoice line item (VAT-inclusive pricing)
 */
export interface ManualInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // VAT-inclusive
  vatRate: number; // 0, 10.5, 21, 27
}

/**
 * Calculate VAT breakdown from manual invoice line items
 * Prices are VAT-inclusive - we extract the VAT component
 *
 * For Factura C (Type 11): Returns zero VAT as these are IVA-exempt invoices
 */
function calculateVatBreakdownFromItems(
  items: ManualInvoiceLineItem[],
  invoiceType: number,
): CalculatedTotals {
  // Calculate total from items
  let itemsTotal = 0;
  for (const item of items) {
    itemsTotal += item.quantity * item.unitPrice;
  }

  // Factura C (Type 11) is IVA-exempt - no VAT calculation
  if (invoiceType === 11) {
    return {
      subtotal: Math.round(itemsTotal * 100) / 100,
      vatBreakdown: [],
      totalVat: 0,
      total: Math.round(itemsTotal * 100) / 100,
    };
  }

  // Group by VAT rate
  const vatGroups: Record<number, { base: number; amount: number }> = {};

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice;

    // Extract VAT (formula: net = total / (1 + rate/100))
    const netAmount = lineTotal / (1 + item.vatRate / 100);
    const vatAmount = lineTotal - netAmount;

    if (!vatGroups[item.vatRate]) {
      vatGroups[item.vatRate] = { base: 0, amount: 0 };
    }

    vatGroups[item.vatRate].base += netAmount;
    vatGroups[item.vatRate].amount += vatAmount;
  }

  // Build breakdown array
  const vatBreakdown: VatBreakdownItem[] = Object.entries(vatGroups).map(
    ([rate, values]) => ({
      rate: Number(rate),
      base: Math.round(values.base * 100) / 100,
      amount: Math.round(values.amount * 100) / 100,
    }),
  );

  const subtotal = vatBreakdown.reduce((sum, v) => sum + v.base, 0);
  const totalVat = vatBreakdown.reduce((sum, v) => sum + v.amount, 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatBreakdown,
    totalVat: Math.round(totalVat * 100) / 100,
    total: Math.round((subtotal + totalVat) * 100) / 100,
  };
}

/**
 * Generate manual invoice (not linked to an order)
 *
 * Use cases:
 * - Custom invoices for services
 * - Manual adjustments
 * - Invoices for items not in the product catalog
 */
export async function generateManualInvoice(params: {
  branchId: string;
  invoiceType: number;
  customerData: CustomerInvoiceData;
  items: ManualInvoiceLineItem[];
  notes?: string;
}): Promise<ActionResult<unknown>> {
  try {
    // Authorization check - only MANAGER and above can generate invoices
    const { userId } = await authorizeAction(UserRole.MANAGER);

    const { branchId, invoiceType, customerData, items } = params;

    // Validate inputs
    if (!items || items.length === 0) {
      return { success: false, error: "Debe agregar al menos un ítem" };
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return { success: false, error: "La cantidad debe ser mayor a 0" };
      }
      if (item.unitPrice <= 0) {
        return { success: false, error: "El precio debe ser mayor a 0" };
      }
      if (![0, 10.5, 21, 27].includes(item.vatRate)) {
        return { success: false, error: "Tasa de IVA inválida" };
      }
    }

    // Validate document
    const docValidation = validateDocument(
      customerData.docType,
      customerData.docNumber,
    );
    if (!docValidation.valid) {
      return { success: false, error: docValidation.error! };
    }

    // Validate invoice type compatibility
    const typeValidation = validateInvoiceTypeCompatibility(
      invoiceType,
      customerData.docType,
    );
    if (!typeValidation.valid) {
      return { success: false, error: typeValidation.error! };
    }

    // Get branch with restaurant
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        restaurant: true,
      },
    });

    if (!branch) {
      return { success: false, error: "Sucursal no encontrada" };
    }

    // Get fiscal configuration
    const fiscalConfig = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId: branch.restaurantId },
    });

    // Get sales point from DB config or fallback to environment
    const ptoVta =
      fiscalConfig?.isEnabled && fiscalConfig.defaultPtoVta
        ? fiscalConfig.defaultPtoVta
        : parseInt(process.env.ARCA_PTO_VTA || "1");

    // Get CUIT from DB config or fallback to environment
    const cuit =
      fiscalConfig?.isEnabled && fiscalConfig.cuit
        ? parseInt(fiscalConfig.cuit)
        : parseInt(process.env.ARCA_CUIT || "0");

    // Get next invoice number from ARCA
    const lastInvoiceResult = await getLastInvoiceNumber(ptoVta, invoiceType);
    if (!lastInvoiceResult.success) {
      return {
        success: false,
        error: "Error al obtener número de factura: " + lastInvoiceResult.error,
      };
    }

    const nextInvoiceNumber = (lastInvoiceResult.data?.cbteNro || 0) + 1;

    // Calculate VAT breakdown from items
    const totals = calculateVatBreakdownFromItems(items, invoiceType);

    // Format date as YYYYMMDD
    const invoiceDate = new Date();
    const dateStr = invoiceDate.toISOString().split("T")[0].replace(/-/g, "");

    // Map VAT rates to ARCA IDs
    const vatRateToId: Record<number, number> = {
      0: 3, // 0% → ID 3
      10.5: 4, // 10.5% → ID 4
      21: 5, // 21% → ID 5
      27: 6, // 27% → ID 6
    };

    // Build ARCA payload
    const afipPayload = {
      CantReg: 1,
      PtoVta: ptoVta,
      CbteTipo: invoiceType,
      Concepto: 1, // 1=Products
      DocTipo: customerData.docType,
      DocNro:
        customerData.docNumber === "0" ? 0 : parseInt(customerData.docNumber),
      CbteDesde: nextInvoiceNumber,
      CbteHasta: nextInvoiceNumber,
      CbteFch: dateStr,
      ImpTotal: totals.total,
      ImpTotConc: 0, // Non-taxed amount
      ImpNeto: totals.subtotal,
      ImpOpEx: 0, // Exempt operations
      ImpTrib: 0, // Other taxes
      // Factura C (Type 11) must have ImpIVA = 0 (IVA-exempt)
      ImpIVA: invoiceType === 11 ? 0 : totals.totalVat,
      MonId: "PES",
      MonCotiz: 1,
      FchServDesde: undefined,
      FchServHasta: undefined,
      FchVtoPago: undefined,
      CondicionIVAReceptorId: invoiceType === 1 ? 1 : 5,
      // VAT breakdown - empty for Factura C (Type 11)
      Iva: invoiceType === 11 ? [] : totals.vatBreakdown.map((vat) => ({
        Id: vatRateToId[vat.rate] || 5,
        BaseImp: vat.base,
        Importe: vat.amount,
      })),
    };

    // Emit invoice to ARCA
    const afipResult = await emitTestInvoice(afipPayload);

    if (!afipResult.success) {
      // Save as FAILED status for retry later
      await prisma.invoice.create({
        data: {
          orderId: null, // Manual invoice - no order
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
          afipResponse: {
            error: afipResult.error,
          } as unknown as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

      return {
        success: false,
        error: "ARCA rechazó la factura: " + afipResult.error,
      };
    }

    // Check for ARCA errors
    const afipData = afipResult.data as AfipResponseData;
    if ("Errors" in afipData && afipData.Errors && afipData.Errors.length > 0) {
      const errorMsg = afipData.Errors.map((e) => `[${e.Code}] ${e.Msg}`).join(
        ", ",
      );

      await prisma.invoice.create({
        data: {
          orderId: null,
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

      return { success: false, error: "Error ARCA: " + errorMsg };
    }

    // Success - extract CAE
    const cae = afipData.cae;
    const caeFchVto = afipData.caeFchVto;

    if (!cae) {
      return { success: false, error: "ARCA no devolvió CAE" };
    }

    // Generate QR URL
    const qrData = generateAfipQrData({
      cuit,
      ptoVta,
      tipoCmp: invoiceType,
      nroCmp: nextInvoiceNumber,
      fecha: afipPayload.CbteFch,
      importe: totals.total,
      moneda: "PES",
      tipoDocRec: customerData.docType,
      nroDocRec:
        customerData.docNumber === "0" ? 0 : parseInt(customerData.docNumber),
      cae,
    });

    const qrUrl = generateAfipQrUrl(qrData);

    // Save invoice with CAE
    const invoice = await prisma.invoice.create({
      data: {
        orderId: null, // KEY DIFFERENCE: Manual invoice has no order
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
    console.error("[generateManualInvoice] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al generar factura",
    };
  }
}

// ============================================================================
// CREDIT/DEBIT NOTES
// ============================================================================

/**
 * Download invoice PDF as base64 data URL (client-side download wrapper)
 */
export async function downloadInvoicePDF(
  invoiceId: string,
): Promise<ActionResult<{ dataUrl: string; filename: string }>> {
  try {
    const result = await generateInvoicePDF(invoiceId);

    if (!result.success) {
      return result as ActionResult<{ dataUrl: string; filename: string }>;
    }

    const { pdf, filename } = result.data;
    const base64 = pdf.toString("base64");
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return {
      success: true,
      data: { dataUrl, filename },
    };
  } catch (error) {
    console.error("[downloadInvoicePDF] Error:", error);
    return {
      success: false,
      error: "Error al descargar PDF",
    };
  }
}

/**
 * Cancel invoice by generating a full credit note
 * Time limit: 21 days from original invoice
 */
export async function cancelInvoiceWithCreditNote(
  invoiceId: string,
): Promise<ActionResult<unknown>> {
  try {
    const { userId } = await authorizeAction(UserRole.MANAGER);

    // Get original invoice
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: true,
            branch: {
              include: { restaurant: true },
            },
          },
        },
      },
    });

    if (!originalInvoice) {
      return { success: false, error: "Factura no encontrada" };
    }

    if (originalInvoice.status !== InvoiceStatus.EMITTED) {
      return {
        success: false,
        error: "Solo se pueden anular facturas emitidas",
      };
    }

    // Validate invoice type (only standard invoices can be canceled: 1, 6, 11)
    if (![1, 6, 11].includes(originalInvoice.invoiceType)) {
      return {
        success: false,
        error: "Solo se pueden anular facturas estándar (A, B, C)",
      };
    }

    // Check time limit (21 days)
    const daysSinceInvoice = Math.floor(
      (Date.now() - originalInvoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceInvoice > 21) {
      return {
        success: false,
        error: "No se puede anular facturas con más de 21 días de antigüedad",
      };
    }

    // Map invoice type to credit note type (1→3, 6→8, 11→15)
    const creditNoteTypeMap: Record<number, number> = {
      1: 3,   // A → NC-A
      6: 8,   // B → NC-B
      11: 15, // C → NC-C
    };
    const creditNoteType = creditNoteTypeMap[originalInvoice.invoiceType];

    // Get fiscal configuration
    const restaurantId = originalInvoice.order?.branch.restaurantId;
    if (!restaurantId) {
      return {
        success: false,
        error: "No se pudo obtener configuración fiscal",
      };
    }

    const fiscalConfig = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId },
    });

    const ptoVta =
      fiscalConfig?.isEnabled && fiscalConfig.defaultPtoVta
        ? fiscalConfig.defaultPtoVta
        : parseInt(process.env.ARCA_PTO_VTA || "1");

    const cuit =
      fiscalConfig?.isEnabled && fiscalConfig.cuit
        ? parseInt(fiscalConfig.cuit)
        : parseInt(process.env.ARCA_CUIT || "0");

    // Get next credit note number
    const lastCreditNoteResult = await getLastInvoiceNumber(ptoVta, creditNoteType);
    if (!lastCreditNoteResult.success) {
      return {
        success: false,
        error: "Error al obtener número de nota de crédito",
      };
    }

    const nextCreditNoteNumber = (lastCreditNoteResult.data?.cbteNro || 0) + 1;

    // Format date as YYYYMMDD
    const creditNoteDate = new Date();
    const dateStr = creditNoteDate.toISOString().split("T")[0].replace(/-/g, "");

    // Build ARCA payload for credit note
    const afipPayload = {
      CantReg: 1,
      PtoVta: ptoVta,
      CbteTipo: creditNoteType,
      Concepto: 1,
      DocTipo: originalInvoice.customerDocType,
      DocNro:
        originalInvoice.customerDocNumber === "0"
          ? 0
          : parseInt(originalInvoice.customerDocNumber),
      CbteDesde: nextCreditNoteNumber,
      CbteHasta: nextCreditNoteNumber,
      CbteFch: dateStr,
      ImpTotal: Number(originalInvoice.totalAmount),
      ImpTotConc: 0,
      ImpNeto: Number(originalInvoice.subtotal),
      ImpOpEx: 0,
      ImpTrib: 0,
      ImpIVA: Number(originalInvoice.vatAmount),
      MonId: "PES",
      MonCotiz: 1,
      FchServDesde: undefined,
      FchServHasta: undefined,
      FchVtoPago: undefined,
      CondicionIVAReceptorId: originalInvoice.invoiceType === 1 ? 1 : 5,
      Iva: (originalInvoice.vatBreakdown as unknown as VatBreakdownItem[]).map((vat) => ({
        Id: 5, // 21% VAT
        BaseImp: vat.base,
        Importe: vat.amount,
      })),
      // MANDATORY: Link to original invoice
      CbtesAsoc: [
        {
          Tipo: originalInvoice.invoiceType,
          PtoVta: originalInvoice.ptoVta,
          Nro: originalInvoice.invoiceNumber,
          Cuit: String(cuit),
          CbteFch: originalInvoice.invoiceDate.toISOString().split("T")[0].replace(/-/g, ""),
        },
      ],
    };

    // Emit credit note to ARCA
    const afipResult = await emitTestInvoice(afipPayload);

    if (!afipResult.success) {
      return {
        success: false,
        error: "ARCA rechazó la nota de crédito: " + afipResult.error,
      };
    }

    const afipData = afipResult.data as AfipResponseData;
    if ("Errors" in afipData && afipData.Errors && afipData.Errors.length > 0) {
      const errorMsg = afipData.Errors.map((e) => `[${e.Code}] ${e.Msg}`).join(", ");
      return { success: false, error: "Error ARCA: " + errorMsg };
    }

    const cae = afipData.cae;
    const caeFchVto = afipData.caeFchVto;

    if (!cae) {
      return { success: false, error: "ARCA no devolvió CAE" };
    }

    // Generate QR URL
    const qrData = generateAfipQrData({
      cuit,
      ptoVta,
      tipoCmp: creditNoteType,
      nroCmp: nextCreditNoteNumber,
      fecha: dateStr,
      importe: Number(originalInvoice.totalAmount),
      moneda: "PES",
      tipoDocRec: originalInvoice.customerDocType,
      nroDocRec:
        originalInvoice.customerDocNumber === "0"
          ? 0
          : parseInt(originalInvoice.customerDocNumber),
      cae,
    });

    const qrUrl = generateAfipQrUrl(qrData);

    // Save credit note
    const creditNote = await prisma.invoice.create({
      data: {
        orderId: originalInvoice.orderId,
        customerName: originalInvoice.customerName,
        customerDocType: originalInvoice.customerDocType,
        customerDocNumber: originalInvoice.customerDocNumber,
        invoiceType: creditNoteType,
        ptoVta,
        invoiceNumber: nextCreditNoteNumber,
        invoiceDate: new Date(),
        subtotal: originalInvoice.subtotal,
        vatAmount: originalInvoice.vatAmount,
        totalAmount: originalInvoice.totalAmount,
        vatBreakdown: originalInvoice.vatBreakdown as Prisma.InputJsonValue,
        cae,
        caeFchVto,
        qrUrl,
        status: "EMITTED",
        afipResponse: afipData as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    // Update original invoice status to CANCELLED
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELLED" },
    });

    const serializedCreditNote = {
      ...creditNote,
      subtotal: Number(creditNote.subtotal),
      vatAmount: Number(creditNote.vatAmount),
      totalAmount: Number(creditNote.totalAmount),
    };

    return { success: true, data: serializedCreditNote };
  } catch (error) {
    console.error("[cancelInvoiceWithCreditNote] Error:", error);
    return {
      success: false,
      error: "Error al anular factura con nota de crédito",
    };
  }
}

/**
 * Generate credit note (full or partial)
 */
export async function generateCreditNote(params: {
  originalInvoiceId: string;
  items: ManualInvoiceLineItem[];
  reason: string;
}): Promise<ActionResult<unknown>> {
  try {
    const { userId } = await authorizeAction(UserRole.MANAGER);

    const { originalInvoiceId, items, reason } = params;

    // Validate items
    if (!items || items.length === 0) {
      return { success: false, error: "Debe agregar al menos un ítem" };
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return { success: false, error: "La cantidad debe ser mayor a 0" };
      }
      if (item.unitPrice <= 0) {
        return { success: false, error: "El precio debe ser mayor a 0" };
      }
    }

    // Get original invoice
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: originalInvoiceId },
      include: {
        order: {
          include: {
            branch: {
              include: { restaurant: true },
            },
          },
        },
      },
    });

    if (!originalInvoice) {
      return { success: false, error: "Factura original no encontrada" };
    }

    if (originalInvoice.status !== InvoiceStatus.EMITTED) {
      return {
        success: false,
        error: "Solo se pueden crear notas de crédito para facturas emitidas",
      };
    }

    // Validate invoice type
    if (![1, 6, 11].includes(originalInvoice.invoiceType)) {
      return {
        success: false,
        error: "Solo se pueden crear NC para facturas estándar (A, B, C)",
      };
    }

    // Check time limit (21 days)
    const daysSinceInvoice = Math.floor(
      (Date.now() - originalInvoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceInvoice > 21) {
      return {
        success: false,
        error: "No se pueden crear NC para facturas con más de 21 días",
      };
    }

    // Map invoice type to credit note type
    const creditNoteTypeMap: Record<number, number> = {
      1: 3,   // A → NC-A
      6: 8,   // B → NC-B
      11: 15, // C → NC-C
    };
    const creditNoteType = creditNoteTypeMap[originalInvoice.invoiceType];

    // Calculate totals
    const totals = calculateVatBreakdownFromItems(items, creditNoteType);

    // Validate credit note amount doesn't exceed original invoice
    if (totals.total > Number(originalInvoice.totalAmount)) {
      return {
        success: false,
        error: "El monto de la NC no puede superar el de la factura original",
      };
    }

    // Get fiscal configuration
    const restaurantId = originalInvoice.order?.branch.restaurantId;
    if (!restaurantId) {
      return {
        success: false,
        error: "No se pudo obtener configuración fiscal",
      };
    }

    const fiscalConfig = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId },
    });

    const ptoVta =
      fiscalConfig?.isEnabled && fiscalConfig.defaultPtoVta
        ? fiscalConfig.defaultPtoVta
        : parseInt(process.env.ARCA_PTO_VTA || "1");

    const cuit =
      fiscalConfig?.isEnabled && fiscalConfig.cuit
        ? parseInt(fiscalConfig.cuit)
        : parseInt(process.env.ARCA_CUIT || "0");

    // Get next credit note number
    const lastCreditNoteResult = await getLastInvoiceNumber(ptoVta, creditNoteType);
    if (!lastCreditNoteResult.success) {
      return {
        success: false,
        error: "Error al obtener número de nota de crédito",
      };
    }

    const nextCreditNoteNumber = (lastCreditNoteResult.data?.cbteNro || 0) + 1;

    // Format date
    const creditNoteDate = new Date();
    const dateStr = creditNoteDate.toISOString().split("T")[0].replace(/-/g, "");

    // Map VAT rates to ARCA IDs
    const vatRateToId: Record<number, number> = {
      0: 3,
      10.5: 4,
      21: 5,
      27: 6,
    };

    // Build ARCA payload
    const afipPayload = {
      CantReg: 1,
      PtoVta: ptoVta,
      CbteTipo: creditNoteType,
      Concepto: 1,
      DocTipo: originalInvoice.customerDocType,
      DocNro:
        originalInvoice.customerDocNumber === "0"
          ? 0
          : parseInt(originalInvoice.customerDocNumber),
      CbteDesde: nextCreditNoteNumber,
      CbteHasta: nextCreditNoteNumber,
      CbteFch: dateStr,
      ImpTotal: totals.total,
      ImpTotConc: 0,
      ImpNeto: totals.subtotal,
      ImpOpEx: 0,
      ImpTrib: 0,
      // NC-C (Type 15) must have ImpIVA = 0 (IVA-exempt)
      ImpIVA: creditNoteType === 15 ? 0 : totals.totalVat,
      MonId: "PES",
      MonCotiz: 1,
      FchServDesde: undefined,
      FchServHasta: undefined,
      FchVtoPago: undefined,
      CondicionIVAReceptorId: originalInvoice.invoiceType === 1 ? 1 : 5,
      // VAT breakdown - empty for NC-C (Type 15)
      Iva: creditNoteType === 15 ? [] : totals.vatBreakdown.map((vat) => ({
        Id: vatRateToId[vat.rate] || 5,
        BaseImp: vat.base,
        Importe: vat.amount,
      })),
      CbtesAsoc: [
        {
          Tipo: originalInvoice.invoiceType,
          PtoVta: originalInvoice.ptoVta,
          Nro: originalInvoice.invoiceNumber,
          Cuit: String(cuit),
          CbteFch: originalInvoice.invoiceDate.toISOString().split("T")[0].replace(/-/g, ""),
        },
      ],
    };

    // Emit credit note to ARCA
    const afipResult = await emitTestInvoice(afipPayload);

    if (!afipResult.success) {
      return {
        success: false,
        error: "ARCA rechazó la nota de crédito: " + afipResult.error,
      };
    }

    const afipData = afipResult.data as AfipResponseData;
    if ("Errors" in afipData && afipData.Errors && afipData.Errors.length > 0) {
      const errorMsg = afipData.Errors.map((e) => `[${e.Code}] ${e.Msg}`).join(", ");
      return { success: false, error: "Error ARCA: " + errorMsg };
    }

    const cae = afipData.cae;
    const caeFchVto = afipData.caeFchVto;

    if (!cae) {
      return { success: false, error: "ARCA no devolvió CAE" };
    }

    // Generate QR URL
    const qrData = generateAfipQrData({
      cuit,
      ptoVta,
      tipoCmp: creditNoteType,
      nroCmp: nextCreditNoteNumber,
      fecha: dateStr,
      importe: totals.total,
      moneda: "PES",
      tipoDocRec: originalInvoice.customerDocType,
      nroDocRec:
        originalInvoice.customerDocNumber === "0"
          ? 0
          : parseInt(originalInvoice.customerDocNumber),
      cae,
    });

    const qrUrl = generateAfipQrUrl(qrData);

    // Save credit note
    const creditNote = await prisma.invoice.create({
      data: {
        orderId: originalInvoice.orderId,
        customerName: originalInvoice.customerName,
        customerDocType: originalInvoice.customerDocType,
        customerDocNumber: originalInvoice.customerDocNumber,
        invoiceType: creditNoteType,
        ptoVta,
        invoiceNumber: nextCreditNoteNumber,
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

    const serializedCreditNote = {
      ...creditNote,
      subtotal: Number(creditNote.subtotal),
      vatAmount: Number(creditNote.vatAmount),
      totalAmount: Number(creditNote.totalAmount),
    };

    return { success: true, data: serializedCreditNote };
  } catch (error) {
    console.error("[generateCreditNote] Error:", error);
    return {
      success: false,
      error: "Error al generar nota de crédito",
    };
  }
}

/**
 * Generate debit note for additional charges
 */
export async function generateDebitNote(params: {
  originalInvoiceId: string;
  items: ManualInvoiceLineItem[];
  reason: string;
}): Promise<ActionResult<unknown>> {
  try {
    const { userId } = await authorizeAction(UserRole.MANAGER);

    const { originalInvoiceId, items, reason } = params;

    // Validate items
    if (!items || items.length === 0) {
      return { success: false, error: "Debe agregar al menos un ítem" };
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return { success: false, error: "La cantidad debe ser mayor a 0" };
      }
      if (item.unitPrice <= 0) {
        return { success: false, error: "El precio debe ser mayor a 0" };
      }
    }

    // Get original invoice
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: originalInvoiceId },
      include: {
        order: {
          include: {
            branch: {
              include: { restaurant: true },
            },
          },
        },
      },
    });

    if (!originalInvoice) {
      return { success: false, error: "Factura original no encontrada" };
    }

    if (originalInvoice.status !== InvoiceStatus.EMITTED) {
      return {
        success: false,
        error: "Solo se pueden crear notas de débito para facturas emitidas",
      };
    }

    // Validate invoice type
    if (![1, 6, 11].includes(originalInvoice.invoiceType)) {
      return {
        success: false,
        error: "Solo se pueden crear ND para facturas estándar (A, B, C)",
      };
    }

    // Check time limit (21 days)
    const daysSinceInvoice = Math.floor(
      (Date.now() - originalInvoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceInvoice > 21) {
      return {
        success: false,
        error: "No se pueden crear ND para facturas con más de 21 días",
      };
    }

    // Map invoice type to debit note type
    const debitNoteTypeMap: Record<number, number> = {
      1: 2,   // A → ND-A
      6: 7,   // B → ND-B
      11: 12, // C → ND-C
    };
    const debitNoteType = debitNoteTypeMap[originalInvoice.invoiceType];

    // Calculate totals
    const totals = calculateVatBreakdownFromItems(items, debitNoteType);

    // Get fiscal configuration
    const restaurantId = originalInvoice.order?.branch.restaurantId;
    if (!restaurantId) {
      return {
        success: false,
        error: "No se pudo obtener configuración fiscal",
      };
    }

    const fiscalConfig = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId },
    });

    const ptoVta =
      fiscalConfig?.isEnabled && fiscalConfig.defaultPtoVta
        ? fiscalConfig.defaultPtoVta
        : parseInt(process.env.ARCA_PTO_VTA || "1");

    const cuit =
      fiscalConfig?.isEnabled && fiscalConfig.cuit
        ? parseInt(fiscalConfig.cuit)
        : parseInt(process.env.ARCA_CUIT || "0");

    // Get next debit note number
    const lastDebitNoteResult = await getLastInvoiceNumber(ptoVta, debitNoteType);
    if (!lastDebitNoteResult.success) {
      return {
        success: false,
        error: "Error al obtener número de nota de débito",
      };
    }

    const nextDebitNoteNumber = (lastDebitNoteResult.data?.cbteNro || 0) + 1;

    // Format date
    const debitNoteDate = new Date();
    const dateStr = debitNoteDate.toISOString().split("T")[0].replace(/-/g, "");

    // Map VAT rates to ARCA IDs
    const vatRateToId: Record<number, number> = {
      0: 3,
      10.5: 4,
      21: 5,
      27: 6,
    };

    // Build ARCA payload
    const afipPayload = {
      CantReg: 1,
      PtoVta: ptoVta,
      CbteTipo: debitNoteType,
      Concepto: 1,
      DocTipo: originalInvoice.customerDocType,
      DocNro:
        originalInvoice.customerDocNumber === "0"
          ? 0
          : parseInt(originalInvoice.customerDocNumber),
      CbteDesde: nextDebitNoteNumber,
      CbteHasta: nextDebitNoteNumber,
      CbteFch: dateStr,
      ImpTotal: totals.total,
      ImpTotConc: 0,
      ImpNeto: totals.subtotal,
      ImpOpEx: 0,
      ImpTrib: 0,
      // ND-C (Type 12) must have ImpIVA = 0 (IVA-exempt)
      ImpIVA: debitNoteType === 12 ? 0 : totals.totalVat,
      MonId: "PES",
      MonCotiz: 1,
      FchServDesde: undefined,
      FchServHasta: undefined,
      FchVtoPago: undefined,
      CondicionIVAReceptorId: originalInvoice.invoiceType === 1 ? 1 : 5,
      // VAT breakdown - empty for ND-C (Type 12)
      Iva: debitNoteType === 12 ? [] : totals.vatBreakdown.map((vat) => ({
        Id: vatRateToId[vat.rate] || 5,
        BaseImp: vat.base,
        Importe: vat.amount,
      })),
      CbtesAsoc: [
        {
          Tipo: originalInvoice.invoiceType,
          PtoVta: originalInvoice.ptoVta,
          Nro: originalInvoice.invoiceNumber,
          Cuit: String(cuit),
          CbteFch: originalInvoice.invoiceDate.toISOString().split("T")[0].replace(/-/g, ""),
        },
      ],
    };

    // Emit debit note to ARCA
    const afipResult = await emitTestInvoice(afipPayload);

    if (!afipResult.success) {
      return {
        success: false,
        error: "ARCA rechazó la nota de débito: " + afipResult.error,
      };
    }

    const afipData = afipResult.data as AfipResponseData;
    if ("Errors" in afipData && afipData.Errors && afipData.Errors.length > 0) {
      const errorMsg = afipData.Errors.map((e) => `[${e.Code}] ${e.Msg}`).join(", ");
      return { success: false, error: "Error ARCA: " + errorMsg };
    }

    const cae = afipData.cae;
    const caeFchVto = afipData.caeFchVto;

    if (!cae) {
      return { success: false, error: "ARCA no devolvió CAE" };
    }

    // Generate QR URL
    const qrData = generateAfipQrData({
      cuit,
      ptoVta,
      tipoCmp: debitNoteType,
      nroCmp: nextDebitNoteNumber,
      fecha: dateStr,
      importe: totals.total,
      moneda: "PES",
      tipoDocRec: originalInvoice.customerDocType,
      nroDocRec:
        originalInvoice.customerDocNumber === "0"
          ? 0
          : parseInt(originalInvoice.customerDocNumber),
      cae,
    });

    const qrUrl = generateAfipQrUrl(qrData);

    // Save debit note
    const debitNote = await prisma.invoice.create({
      data: {
        orderId: originalInvoice.orderId,
        customerName: originalInvoice.customerName,
        customerDocType: originalInvoice.customerDocType,
        customerDocNumber: originalInvoice.customerDocNumber,
        invoiceType: debitNoteType,
        ptoVta,
        invoiceNumber: nextDebitNoteNumber,
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

    const serializedDebitNote = {
      ...debitNote,
      subtotal: Number(debitNote.subtotal),
      vatAmount: Number(debitNote.vatAmount),
      totalAmount: Number(debitNote.totalAmount),
    };

    return { success: true, data: serializedDebitNote };
  } catch (error) {
    console.error("[generateDebitNote] Error:", error);
    return {
      success: false,
      error: "Error al generar nota de débito",
    };
  }
}
