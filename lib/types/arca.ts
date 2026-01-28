/**
 * ARCA/ARCA Type Definitions
 *
 * Types and constants for working with Argentina's ARCA (formerly ARCA)
 * electronic invoicing system through the Arca SDK.
 */

// ============================================================================
// Invoice Input Types
// ============================================================================

/**
 * Invoice input parameters for Arca SDK
 * Based on IVoucher from @arcasdk/core
 */
export type ArcaInvoiceInput = {
  // Invoice registration count (usually 1)
  CantReg: number;

  // Document configuration
  CbteTipo: number; // Invoice type (1=A, 6=B, 11=C, etc.)
  PtoVta: number; // Sales point number

  // Customer information
  DocTipo: number; // Document type (80=CUIT, 96=DNI, 99=Consumidor Final)
  DocNro: number; // Document number (0 for Consumidor Final)

  // Invoice numbering
  CbteDesde: number; // Invoice number from
  CbteHasta: number; // Invoice number to (same as CbteDesde for single invoice)
  CbteFch: string; // Invoice date (YYYYMMDD format as string)

  // Concept (1=Products, 2=Services, 3=Both)
  Concepto: number;

  // Amounts
  ImpTotal: number; // Total amount
  ImpNeto: number; // Net taxable amount
  ImpTotConc: number; // Not taxed amount (required, use 0 if none)
  ImpOpEx: number; // Exempt operations amount (required, use 0 if none)
  ImpIVA: number; // Total VAT amount
  ImpTrib: number; // Other taxes amount (required, use 0 if none)

  // Currency (usually "PES" for pesos)
  MonId: string;
  MonCotiz: number; // Exchange rate (1 for pesos)

  // IVA Receptor condition (required)
  CondicionIVAReceptorId: number; // 1=IVA Responsable Inscripto, 5=Consumidor Final

  // VAT breakdown
  Iva?: Array<{
    Id: number; // VAT rate type (3=0%, 4=10.5%, 5=21%, 6=27%)
    BaseImp: number; // Base amount for this rate
    Importe: number; // VAT amount for this rate
  }>;

  // Optional tributes/other taxes
  Tributos?: Array<{
    Id: number;
    Desc: string;
    BaseImp: number;
    Alic: number;
    Importe: number;
  }>;

  // Optional fields
  FchServDesde?: string; // Service date from (for services)
  FchServHasta?: string; // Service date to (for services)
  FchVtoPago?: string; // Payment due date
  CbtesAsoc?: Array<{
    // Associated vouchers
    Tipo: number;
    PtoVta: number;
    Nro: number;
    Cuit: string;
    CbteFch?: string;
  }>;
  Opcionales?: Array<{
    // Optional data
    Id: string;
    Valor: string;
  }>;
  Compradores?: Array<{
    // Buyers
    DocTipo: number;
    DocNro: number;
    Porcentaje: number;
  }>;
};

// ============================================================================
// ARCA Response Types
// ============================================================================

/**
 * Response from createVoucher method
 * Based on ICreateVoucherResult from @arcasdk/core
 */
export type ArcaCreateVoucherResponse = {
  cae: string; // Authorization code (CAE)
  caeFchVto: string; // CAE expiration date
  response: unknown; // Full ARCA response (complex object)
  cuit?: number; // Issuer CUIT (added for QR generation)
};

/**
 * Response from getLastVoucher method
 * Based on LastVoucherResultDto from @arcasdk/core
 */
export type ArcaLastVoucherResponse = {
  cbteNro: number; // Last invoice number (lowercase!)
  cbteTipo: number; // Invoice type
  ptoVta: number; // Sales point
  errors?: {
    err?: Array<{
      code: number;
      msg: string;
    }>;
  };
};

/**
 * ARCA QR Code data structure (RG 4892/2020)
 * Used for generating QR codes on electronic invoices
 *
 * @see https://www.ARCA.gob.ar/fe/qr/
 */
export type AfipQrData = {
  ver: number; // Format version (always 1)
  fecha: string; // Invoice date (YYYY-MM-DD)
  cuit: number; // Issuer CUIT (11 digits)
  ptoVta: number; // Point of sale
  tipoCmp: number; // Invoice type (1=A, 6=B, 11=C)
  nroCmp: number; // Invoice number
  importe: number; // Total amount (2 decimals)
  moneda: string; // Currency code (e.g., "PES")
  ctz: number; // Exchange rate (1.00 for pesos)
  tipoDocRec: number; // Recipient doc type
  nroDocRec: number; // Recipient document number
  tipoCodAut: string; // Auth type ("E" for CAE)
  codAut: string; // CAE code (14 digits)
};

// ============================================================================
// Invoice Type Definitions
// ============================================================================

export type ArcaInvoiceType = {
  code: number;
  name: string;
  description: string;
};

/**
 * Supported invoice types in Argentina
 *
 * - Factura A: For transactions between registered taxpayers (Responsable Inscripto)
 * - Factura B: For sales to final consumers and self-employed (Monotributista)
 * - Factura C: For VAT-exempt transactions
 * - Notas de Crédito/Débito: Credit and debit notes for adjustments, refunds, or additional charges
 *
 * WSFEV1 Support for Credit/Debit Notes:
 * - All credit and debit note types (2, 3, 7, 8, 12, 15) are fully supported
 * - CbtesAsoc field is MANDATORY to link to the original invoice
 * - Time limit: 15-21 days from original invoice date to issue adjustment vouchers
 * - Partial credit notes are supported for discounts and adjustments
 */
export const INVOICE_TYPES: ArcaInvoiceType[] = [
  {
    code: 1,
    name: "Factura A",
    description: "Responsable Inscripto",
  },
  {
    code: 6,
    name: "Factura B",
    description: "Consumidor Final / Monotributista",
  },
  {
    code: 11,
    name: "Factura C",
    description: "IVA Exento",
  },
  {
    code: 2,
    name: "Nota de Débito A",
    description: "Débito para Factura A",
  },
  {
    code: 3,
    name: "Nota de Crédito A",
    description: "Crédito para Factura A",
  },
  {
    code: 7,
    name: "Nota de Débito B",
    description: "Débito para Factura B",
  },
  {
    code: 8,
    name: "Nota de Crédito B",
    description: "Crédito para Factura B",
  },
  {
    code: 12,
    name: "Nota de Débito C",
    description: "Débito para Factura C",
  },
  {
    code: 15,
    name: "Nota de Crédito C",
    description: "Crédito para Factura C",
  },
];

/**
 * Valid invoice type codes
 */
export type InvoiceTypeCode = 1 | 2 | 3 | 6 | 7 | 8 | 11 | 12 | 15;

// ============================================================================
// Document Type Definitions
// ============================================================================

export type ArcaDocumentType = {
  code: number;
  name: string;
  description?: string;
};

/**
 * Customer document types accepted by ARCA
 */
export const DOCUMENT_TYPES: ArcaDocumentType[] = [
  {
    code: 80,
    name: "CUIT",
    description: "Clave Única de Identificación Tributaria",
  },
  {
    code: 86,
    name: "CUIL",
    description: "Código Único de Identificación Laboral",
  },
  {
    code: 96,
    name: "DNI",
    description: "Documento Nacional de Identidad",
  },
  {
    code: 99,
    name: "Consumidor Final",
    description: "Sin identificación (usar DocNro = 0)",
  },
];

// ============================================================================
// VAT Rate Definitions
// ============================================================================

export type ArcaVatRate = {
  id: number;
  rate: number;
  name: string;
  description?: string;
};

/**
 * VAT rates available in Argentina
 *
 * The 'id' is used in the ARCA API
 * The 'rate' is the percentage value
 */
export const VAT_RATES: ArcaVatRate[] = [
  {
    id: 3,
    rate: 0,
    name: "0%",
    description: "No Gravado",
  },
  {
    id: 4,
    rate: 10.5,
    name: "10.5%",
    description: "Tasa reducida",
  },
  {
    id: 5,
    rate: 21,
    name: "21%",
    description: "Tasa general",
  },
  {
    id: 6,
    rate: 27,
    name: "27%",
    description: "Tasa incrementada",
  },
];

// ============================================================================
// Concept Definitions
// ============================================================================

export type ArcaConcept = {
  code: number;
  name: string;
  description: string;
};

/**
 * Invoice concept types
 */
export const CONCEPTS: ArcaConcept[] = [
  {
    code: 1,
    name: "Productos",
    description: "Venta de productos/bienes",
  },
  {
    code: 2,
    name: "Servicios",
    description: "Prestación de servicios",
  },
  {
    code: 3,
    name: "Productos y Servicios",
    description: "Combinación de ambos",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date to ARCA format (YYYYMMDD as string)
 */
export function formatArcaDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Parse ARCA date format (YYYYMMDD) to Date
 */
export function parseArcaDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

/**
 * Calculate VAT amount from net amount and rate
 */
export function calculateVat(netAmount: number, vatRate: number): number {
  return Number((netAmount * (vatRate / 100)).toFixed(2));
}

/**
 * Calculate total from net amount and VAT amount
 */
export function calculateTotal(netAmount: number, vatAmount: number): number {
  return Number((netAmount + vatAmount).toFixed(2));
}

/**
 * Get invoice type by code
 */
export function getInvoiceType(code: number): ArcaInvoiceType | undefined {
  return INVOICE_TYPES.find((type) => type.code === code);
}

/**
 * Get document type by code
 */
export function getDocumentType(code: number): ArcaDocumentType | undefined {
  return DOCUMENT_TYPES.find((type) => type.code === code);
}

/**
 * Get VAT rate by id
 */
export function getVatRate(id: number): ArcaVatRate | undefined {
  return VAT_RATES.find((rate) => rate.id === id);
}
