import type { TableShapeType } from "./table";

export interface TableWithReservations {
  id: string;
  number: number;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
  shape: string | null;
  status: string | null;
  isActive: boolean;
  isShared: boolean;
  sectorId: string | null;
  reservations: Array<{
    reservation: {
      customerName: string;
      people: number;
      status: string;
      date: string;
      timeSlot: {
        startTime: string;
        endTime: string;
      } | null;
    };
  }>;
}

export interface Sector {
  id: string;
  name: string;
  color: string;
  order: number;
  width: number;
  height: number;
  _count: {
    tables: number;
  };
}

export interface NewTableFormState {
  number: string;
  name: string;
  shape: TableShapeType;
  capacity: string;
  isShared: boolean;
  sectorId: string;
}

export interface DialogState {
  addSector: boolean;
  editSector: boolean;
  addTable: boolean;
}

export const SHAPE_DEFAULTS = {
  CIRCLE: { width: 100, height: 100 },
  SQUARE: { width: 100, height: 100 },
  RECTANGLE: { width: 200, height: 100 },
  WIDE: { width: 300, height: 100 },
} as const;

export const INITIAL_TABLE_FORM: NewTableFormState = {
  number: "",
  name: "",
  shape: "SQUARE",
  capacity: "4",
  isShared: false,
  sectorId: "",
};
