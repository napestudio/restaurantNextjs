import {} from "@/components/ui/card";
import type { TableShapeType, TableStatus } from "@/types/table";
import { Maximize2 } from "lucide-react";
import { TablePropertiesForm } from "./table-properties-form";

interface FloorTable {
  id: string;
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: TableShapeType;
  capacity: number;
  status: TableStatus;
  currentGuests: number;
  isShared?: boolean;
}

interface TablePropertiesPanelProps {
  selectedTable: FloorTable | undefined;
  sectorName?: string | null;
  sectorColor?: string | null;
  onUpdateShape: (tableId: string, shape: TableShapeType) => void;
  onUpdateCapacity: (tableId: string, capacity: number) => void;
  onUpdateStatus: (tableId: string, status: TableStatus) => void;
  onUpdateIsShared: (tableId: string, isShared: boolean) => void;
  onUpdateSize: (tableId: string, size: "normal" | "big") => void;
  onRotate: (tableId: string) => void;
  onDelete: (tableId: string) => void;
  isEditMode: boolean;
  hasActiveOrders?: boolean;
}

export function TablePropertiesPanel({
  selectedTable,
  sectorName,
  sectorColor,
  onUpdateShape,
  onUpdateCapacity,
  onUpdateStatus,
  onUpdateIsShared,
  onUpdateSize,
  onRotate,
  onDelete,
  isEditMode,
  hasActiveOrders = false,
}: TablePropertiesPanelProps) {
  return (
    <div className="sticky top-4 gap-2 h-[calc(100svh-120px)] bg-neutral-50 ">
      <div>
        <div className="text-lg bg-amber-100  py-1.5">
          Propiedades de la Mesa
        </div>
        {!selectedTable && (
          <div className="px-2">Selecciona una mesa para editar</div>
        )}
      </div>
      {isEditMode ? (
        <div>
          {selectedTable ? (
            <TablePropertiesForm
              selectedTable={selectedTable}
              sectorName={sectorName}
              sectorColor={sectorColor}
              onUpdateShape={onUpdateShape}
              onUpdateCapacity={onUpdateCapacity}
              onUpdateStatus={onUpdateStatus}
              onUpdateIsShared={onUpdateIsShared}
              onUpdateSize={onUpdateSize}
              onRotate={onRotate}
              onDelete={onDelete}
              isEditMode={isEditMode}
              hasActiveOrders={hasActiveOrders}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Maximize2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Haz clic en una mesa para ver y editar sus propiedades
              </p>
            </div>
          )}
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}
