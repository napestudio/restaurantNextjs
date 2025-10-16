export type TableShapeType = "CIRCLE" | "SQUARE" | "RECTANGLE" | "WIDE";

export type TableStatus = "empty" | "occupied" | "reserved" | "cleaning";

export interface FloorTable {
  id: string;
  number: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: TableShapeType;
  capacity: number;
  status: TableStatus;
  isShared?: boolean;
}
