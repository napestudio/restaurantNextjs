import { CSVImportRow, ValidationError } from "./csv-types";
import { parsePrice, parseDecimal } from "./csv-parser";
import { Category } from "@/app/generated/prisma";

/**
 * Validate a single CSV row
 * Returns array of validation errors/warnings
 */
export function validateRow(
  row: CSVImportRow,
  categories: Category[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required: Name
  if (!row.Nombre?.trim()) {
    errors.push({
      field: "Nombre",
      message: "El nombre del producto es requerido",
      severity: "error",
    });
  } else if (row.Nombre.length > 255) {
    errors.push({
      field: "Nombre",
      message: "El nombre no puede exceder 255 caracteres",
      severity: "error",
    });
  }

  // Required: At least one price
  const prices = {
    dineIn: parsePrice(row["Precio Comedor"]),
    takeAway: parsePrice(row["Precio Para Llevar"]),
    delivery: parsePrice(row["Precio Delivery"]),
  };

  if (!prices.dineIn && !prices.takeAway && !prices.delivery) {
    errors.push({
      field: "Precios",
      message:
        "Debe definir al menos un precio (Comedor, Para Llevar, o Delivery)",
      severity: "error",
    });
  }

  // Validate negative prices
  if (prices.dineIn < 0 || prices.takeAway < 0 || prices.delivery < 0) {
    errors.push({
      field: "Precios",
      message: "Los precios no pueden ser negativos",
      severity: "error",
    });
  }

  // Optional: Category existence
  if (row.Categoría && row.Categoría !== "Sin categoría") {
    const categoryExists = categories.some(
      (c) => c.name.toLowerCase() === row.Categoría!.toLowerCase()
    );

    if (!categoryExists) {
      errors.push({
        field: "Categoría",
        message: `La categoría "${row.Categoría}" no existe. El producto se creará sin categoría.`,
        severity: "warning", // Warning, not error
      });
    }
  }

  // Stock validation
  const stock = parseDecimal(row.Stock);
  if (stock !== null && stock < 0) {
    errors.push({
      field: "Stock",
      message: "El stock no puede ser negativo",
      severity: "error",
    });
  }

  const minStock = parseDecimal(row["Stock Mínimo"]);
  if (minStock !== null && minStock < 0) {
    errors.push({
      field: "Stock Mínimo",
      message: "El stock mínimo no puede ser negativo",
      severity: "error",
    });
  }

  // Unit type validation (match enums from schema)
  if (row["Tipo de Unidad"]) {
    const validUnits = [
      "Unidades",
      "KILOGRAM",
      "GRAM",
      "POUND",
      "OUNCE", // Weight
      "LITER",
      "MILLILITER",
      "GALLON",
      "FLUID_OUNCE", // Volume
    ];

    if (!validUnits.includes(row["Tipo de Unidad"])) {
      errors.push({
        field: "Tipo de Unidad",
        message: `Tipo de unidad inválido. Valores permitidos: ${validUnits.join(", ")}`,
        severity: "error",
      });
    }
  }

  // Active status validation
  if (
    row.Activo &&
    !["Sí", "No", "true", "false", "Si", "si", "sí", ""].includes(row.Activo)
  ) {
    errors.push({
      field: "Activo",
      message: 'El campo Activo debe ser "Sí", "No", o estar vacío',
      severity: "warning",
    });
  }

  // Warning: No SKU (makes future updates harder)
  if (!row.SKU?.trim()) {
    errors.push({
      field: "SKU",
      message:
        "Sin SKU. Recomendamos usar SKU único para facilitar actualizaciones futuras.",
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate all rows and return categorized results
 */
export function validateAllRows(
  rows: CSVImportRow[],
  categories: Category[]
): {
  validCount: number;
  warningCount: number;
  errorCount: number;
  rowValidations: Map<number, ValidationError[]>;
} {
  const rowValidations = new Map<number, ValidationError[]>();
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  rows.forEach((row, index) => {
    const errors = validateRow(row, categories);
    rowValidations.set(index, errors);

    const hasErrors = errors.some((e) => e.severity === "error");
    const hasWarnings = errors.some((e) => e.severity === "warning");

    if (hasErrors) {
      errorCount++;
    } else if (hasWarnings) {
      warningCount++;
    } else {
      validCount++;
    }
  });

  return {
    validCount,
    warningCount,
    errorCount,
    rowValidations,
  };
}

/**
 * Get user-friendly error messages
 */
export const ERROR_MESSAGES = {
  NAME_REQUIRED: "El nombre del producto es obligatorio",
  NO_PRICE: "Debe definir al menos un precio",
  NEGATIVE_STOCK: "El stock no puede ser negativo",
  NEGATIVE_PRICE: "El precio no puede ser negativo",
  CATEGORY_NOT_FOUND: "La categoría no existe",
  DUPLICATE_SKU: "El SKU ya existe",
  FILE_TOO_LARGE: "El archivo es demasiado grande. El máximo permitido es 5MB.",
  EMPTY_FILE: "El archivo CSV está vacío.",
  MISSING_COLUMN: "Falta la columna requerida",
  INVALID_FORMAT: "Formato de archivo inválido. Use un archivo CSV.",
};
