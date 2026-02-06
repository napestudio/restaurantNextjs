/**
 * ARCA QR Code Generation Utilities
 *
 * Generates ARCA-compliant QR codes for electronic invoices
 * according to RG 4892/2020 specification.
 *
 * @see https://www.ARCA.gob.ar/fe/qr/
 */

export interface AfipQrData {
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
}

/**
 * Convert ARCA internal date format (YYYYMMDD) to QR format (YYYY-MM-DD)
 *
 * @param dateStr - ARCA date string in YYYYMMDD format
 * @returns ISO date string in YYYY-MM-DD format
 * @throws Error if date format is invalid
 *
 * @example
 * formatDateForQr("20260125") // Returns: "2026-01-25"
 */
export function formatDateForQr(dateStr: string): string {
  if (!/^\d{8}$/.test(dateStr)) {
    throw new Error(`Invalid ARCA date format: ${dateStr}. Expected YYYYMMDD.`);
  }

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Generate ARCA QR data object from invoice parameters
 *
 * Creates the JSON structure required by ARCA for QR code generation.
 * This follows the RG 4892/2020 specification.
 *
 * @param params - Invoice parameters
 * @param params.cuit - Issuer's CUIT (11 digits)
 * @param params.ptoVta - Point of sale number
 * @param params.tipoCmp - Invoice type code (1=A, 6=B, 11=C)
 * @param params.nroCmp - Invoice number
 * @param params.fecha - Invoice date in ARCA format (YYYYMMDD)
 * @param params.importe - Total invoice amount
 * @param params.moneda - Currency code (e.g., "PES")
 * @param params.tipoDocRec - Recipient document type
 * @param params.nroDocRec - Recipient document number
 * @param params.cae - CAE authorization code (14 digits)
 * @returns ARCA QR data object ready for encoding
 *
 * @example
 * const qrData = generateAfipQrData({
 *   cuit: 20111111112,
 *   ptoVta: 1,
 *   tipoCmp: 6,
 *   nroCmp: 123,
 *   fecha: "20260125",
 *   importe: 8600.00,
 *   moneda: "PES",
 *   tipoDocRec: 99,
 *   nroDocRec: 0,
 *   cae: "12345678901234"
 * });
 */
export function generateAfipQrData(params: {
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  fecha: string; // ARCA format YYYYMMDD
  importe: number;
  moneda: string;
  tipoDocRec: number;
  nroDocRec: number;
  cae: string;
}): AfipQrData {
  return {
    ver: 1,
    fecha: formatDateForQr(params.fecha),
    cuit: params.cuit,
    ptoVta: params.ptoVta,
    tipoCmp: params.tipoCmp,
    nroCmp: params.nroCmp,
    importe: Number(params.importe.toFixed(2)),
    moneda: params.moneda,
    ctz: params.moneda === "PES" ? 1.0 : 1.0,
    tipoDocRec: params.tipoDocRec,
    nroDocRec: params.nroDocRec,
    tipoCodAut: "E", // Always "E" for CAE
    codAut: params.cae,
  };
}

/**
 * Generate ARCA QR URL from invoice data
 *
 * Encodes the invoice data as Base64 and creates the ARCA verification URL.
 * When scanned, this QR code will open the ARCA website where customers can
 * verify the invoice authenticity.
 *
 * @param qrData - ARCA QR data object
 * @returns Full ARCA verification URL to encode in QR code
 *
 * @example
 * const url = generateAfipQrUrl(qrData);
 * // Returns: "https://www.ARCA.gob.ar/fe/qr/?p=eyJ2ZXIiOjEsImZlY2hhIjoi..."
 */
export function generateAfipQrUrl(qrData: AfipQrData): string {
  const jsonStr = JSON.stringify(qrData);
  const base64 = Buffer.from(jsonStr, "utf-8").toString("base64");
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}

/**
 * Validate CAE format
 *
 * Checks if the CAE (Código de Autorización Electrónica) has the correct format.
 * CAE must be exactly 14 digits.
 *
 * @param cae - CAE authorization code to validate
 * @returns true if CAE format is valid, false otherwise
 *
 * @example
 * isValidCae("12345678901234") // Returns: true
 * isValidCae("123456789")      // Returns: false
 * isValidCae("ABC123")         // Returns: false
 */
export function isValidCae(cae: string): boolean {
  return /^\d{14}$/.test(cae);
}
