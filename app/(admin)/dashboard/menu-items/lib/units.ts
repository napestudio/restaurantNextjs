import { UnitType, WeightUnit, VolumeUnit } from "@/app/generated/prisma";

/**
 * Obtiene la etiqueta de la unidad en español
 */
export function getUnitLabel(
  unitType: UnitType,
  weightUnit?: WeightUnit | null,
  volumeUnit?: VolumeUnit | null
): string {
  switch (unitType) {
    case "UNIT":
      return "unidades";
    case "WEIGHT":
      return getWeightUnitLabel(weightUnit);
    case "VOLUME":
      return getVolumeUnitLabel(volumeUnit);
    default:
      return "unidades";
  }
}

/**
 * Obtiene la etiqueta abreviada de la unidad
 */
export function getUnitShortLabel(
  unitType: UnitType,
  weightUnit?: WeightUnit | null,
  volumeUnit?: VolumeUnit | null
): string {
  switch (unitType) {
    case "UNIT":
      return "u";
    case "WEIGHT":
      return getWeightUnitShortLabel(weightUnit);
    case "VOLUME":
      return getVolumeUnitShortLabel(volumeUnit);
    default:
      return "u";
  }
}

/**
 * Etiquetas de unidades de peso
 */
export function getWeightUnitLabel(unit?: WeightUnit | null): string {
  switch (unit) {
    case "KILOGRAM":
      return "kilogramos";
    case "GRAM":
      return "gramos";
    case "POUND":
      return "libras";
    case "OUNCE":
      return "onzas";
    default:
      return "kg";
  }
}

export function getWeightUnitShortLabel(unit?: WeightUnit | null): string {
  switch (unit) {
    case "KILOGRAM":
      return "kg";
    case "GRAM":
      return "g";
    case "POUND":
      return "lb";
    case "OUNCE":
      return "oz";
    default:
      return "kg";
  }
}

/**
 * Etiquetas de unidades de volumen
 */
export function getVolumeUnitLabel(unit?: VolumeUnit | null): string {
  switch (unit) {
    case "LITER":
      return "litros";
    case "MILLILITER":
      return "mililitros";
    case "GALLON":
      return "galones";
    case "FLUID_OUNCE":
      return "onzas líquidas";
    default:
      return "L";
  }
}

export function getVolumeUnitShortLabel(unit?: VolumeUnit | null): string {
  switch (unit) {
    case "LITER":
      return "L";
    case "MILLILITER":
      return "ml";
    case "GALLON":
      return "gal";
    case "FLUID_OUNCE":
      return "fl oz";
    default:
      return "L";
  }
}

/**
 * Opciones de unidades de peso para formularios
 */
export const WEIGHT_UNIT_OPTIONS = [
  { value: "KILOGRAM", label: "Kilogramos (kg)" },
  { value: "GRAM", label: "Gramos (g)" },
  { value: "POUND", label: "Libras (lb)" },
  { value: "OUNCE", label: "Onzas (oz)" },
] as const;

/**
 * Opciones de unidades de volumen para formularios
 */
export const VOLUME_UNIT_OPTIONS = [
  { value: "LITER", label: "Litros (L)" },
  { value: "MILLILITER", label: "Mililitros (ml)" },
  { value: "GALLON", label: "Galones (gal)" },
  { value: "FLUID_OUNCE", label: "Onzas líquidas (fl oz)" },
] as const;

/**
 * Opciones de tipo de unidad para formularios
 */
export const UNIT_TYPE_OPTIONS = [
  { value: "UNIT", label: "Unidades", description: "Para productos contables (ej: botellas, platos)" },
  { value: "WEIGHT", label: "Peso", description: "Para productos que se miden por peso (ej: carne, harina)" },
  { value: "VOLUME", label: "Volumen", description: "Para productos que se miden por volumen (ej: bebidas, aceites)" },
] as const;

/**
 * Opciones de tipo de precio para formularios
 */
export const PRICE_TYPE_OPTIONS = [
  { value: "DINE_IN", label: "Para consumir en local" },
  { value: "TAKE_AWAY", label: "Para llevar" },
  { value: "DELIVERY", label: "Delivery" },
] as const;

/**
 * Convierte un valor de stock a un formato legible
 */
export function formatStock(
  stock: number,
  unitType: UnitType,
  weightUnit?: WeightUnit | null,
  volumeUnit?: VolumeUnit | null
): string {
  const unit = getUnitShortLabel(unitType, weightUnit, volumeUnit);

  // Para unidades, no mostrar decimales
  if (unitType === "UNIT") {
    return `${Math.floor(stock)} ${unit}`;
  }

  // Para peso y volumen, mostrar hasta 2 decimales
  return `${stock.toFixed(2)} ${unit}`;
}
