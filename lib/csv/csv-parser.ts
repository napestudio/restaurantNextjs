import Papa from "papaparse";
import { CSVImportRow } from "./csv-types";
import { UnitType } from "@/app/generated/prisma";

// Expected CSV columns (Spanish, matching export format)
const REQUIRED_COLUMNS = ["Nombre"];
const OPTIONAL_COLUMNS = [
  "SKU",
  "Categoría",
  "Stock",
  "Stock Mínimo",
  "Precio Comedor",
  "Precio Para Llevar",
  "Precio Delivery",
  "Tipo de Unidad",
  "Descripción",
  "Activo",
];

export type ParseResult = {
  success: boolean;
  data?: CSVImportRow[];
  error?: string;
  missing?: string[];
  extra?: string[];
};

/**
 * Parse CSV file using PapaParse
 * Client-side parsing with validation
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CSVImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          resolve({
            success: false,
            error: `Error de formato: ${results.errors[0].message}`,
          });
          return;
        }

        if (results.data.length === 0) {
          resolve({
            success: false,
            error: "El archivo CSV está vacío",
          });
          return;
        }

        // Validate structure
        const headers = results.meta.fields || [];
        const structureValidation = validateCSVStructure(headers);

        if (!structureValidation.valid) {
          resolve({
            success: false,
            error: `Faltan columnas requeridas: ${structureValidation.missing.join(", ")}`,
            missing: structureValidation.missing,
          });
          return;
        }

        resolve({
          success: true,
          data: results.data,
          extra: structureValidation.extra,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          error: `Error al leer el archivo: ${error.message}`,
        });
      },
    });
  });
}

/**
 * Validate CSV structure (check for required columns)
 */
export function validateCSVStructure(headers: string[]): {
  valid: boolean;
  missing: string[];
  extra: string[];
} {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  const extra = headers.filter(
    (col) => ![...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].includes(col)
  );

  return {
    valid: missing.length === 0,
    missing,
    extra, // Informational only, not an error
  };
}

/**
 * Parse price value from CSV
 * Removes currency symbols and parses to number
 */
export function parsePrice(value: string | undefined): number {
  if (!value) return 0;
  // Remove currency symbol, commas, and spaces
  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse decimal value from CSV (for stock)
 * Handles "Siempre disponible" and "N/A"
 */
export function parseDecimal(value: string | undefined): number | null {
  if (!value || value === "Siempre disponible" || value === "N/A") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse unit type from CSV
 * Converts display labels to UnitType enum
 */
export function parseUnitType(value: string | undefined): UnitType {
  if (!value || value === "Unidades") return "UNIT";

  // Weight units
  if (["KILOGRAM", "GRAM", "POUND", "OUNCE"].includes(value)) {
    return "WEIGHT";
  }

  // Volume units
  if (["LITER", "MILLILITER", "GALLON", "FLUID_OUNCE"].includes(value)) {
    return "VOLUME";
  }

  return "UNIT"; // Default
}

/**
 * Parse active status from CSV
 * Converts "Sí"/"No" to boolean
 */
export function parseActive(value: string | undefined): boolean {
  if (!value) return true; // Default to active
  const lower = value.toLowerCase();
  return lower === "sí" || lower === "si" || lower === "true" || lower === "1";
}

/**
 * Generate CSV content for error export
 */
export function generateErrorCSV(
  rows: CSVImportRow[],
  errorIndices: number[]
): string {
  const errorRows = rows.filter((_, index) => errorIndices.includes(index));

  return Papa.unparse(errorRows, {
    header: true,
    columns: [
      "Nombre",
      "SKU",
      "Categoría",
      "Stock",
      "Stock Mínimo",
      "Precio Comedor",
      "Precio Para Llevar",
      "Precio Delivery",
      "Tipo de Unidad",
      "Descripción",
      "Activo",
    ],
  });
}

/**
 * Generate template CSV for download
 */
export function generateTemplateCSV(): string {
  const template = [
    {
      Nombre: "Hamburguesa Clásica",
      SKU: "BURG001",
      Categoría: "Principales",
      Stock: "50",
      "Stock Mínimo": "10",
      "Precio Comedor": "$12.50",
      "Precio Para Llevar": "$11.00",
      "Precio Delivery": "$13.50",
      "Tipo de Unidad": "Unidades",
      Descripción: "Hamburguesa con carne y queso",
      Activo: "Sí",
    },
    {
      Nombre: "Pizza Margarita",
      SKU: "PIZZ001",
      Categoría: "Pizzas",
      Stock: "30",
      "Stock Mínimo": "5",
      "Precio Comedor": "$18.00",
      "Precio Para Llevar": "$16.50",
      "Precio Delivery": "$19.50",
      "Tipo de Unidad": "Unidades",
      Descripción: "Pizza tradicional italiana",
      Activo: "Sí",
    },
    {
      Nombre: "Coca Cola 500ml",
      SKU: "BEBID001",
      Categoría: "Bebidas",
      Stock: "100",
      "Stock Mínimo": "20",
      "Precio Comedor": "$2.50",
      "Precio Para Llevar": "$2.50",
      "Precio Delivery": "$2.50",
      "Tipo de Unidad": "Unidades",
      Descripción: "Refresco",
      Activo: "Sí",
    },
  ];

  return Papa.unparse(template, {
    header: true,
  });
}
