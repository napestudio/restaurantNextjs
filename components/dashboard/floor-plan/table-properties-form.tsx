import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RotateCw,
  Trash2,
  Users,
  Circle,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";
import type { TableShapeType, TableStatus } from "@/types/table";

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

interface TablePropertiesFormProps {
  selectedTable: FloorTable;
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

export function TablePropertiesForm({
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
}: TablePropertiesFormProps) {
  // Disable editing if table has active orders (except position which is handled in canvas)
  const isLocked = hasActiveOrders;

  return (
    <div className="space-y-4">
      {hasActiveOrders && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 font-medium">
            Esta mesa tiene órdenes activas. Solo puedes mover su posición, pero
            no modificar sus propiedades.
          </p>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Número de Mesa</Label>
        <div className="text-lg font-bold">{selectedTable.number}</div>
      </div>

      {sectorName && (
        <div>
          <Label className="text-xs text-muted-foreground">Sector</Label>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: sectorColor || "#3b82f6" }}
            />
            <span className="text-sm font-medium">{sectorName}</span>
          </div>
        </div>
      )}

      <div>
        <Label
          htmlFor="edit-shape"
          className="text-xs text-muted-foreground mb-2 block"
        >
          Forma
        </Label>
        <Select
          value={selectedTable.shape}
          onValueChange={(value: TableShapeType) =>
            onUpdateShape(selectedTable.id, value)
          }
          disabled={!isEditMode || isLocked}
        >
          <SelectTrigger id="edit-shape">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CIRCLE">
              <div className="flex items-center space-x-2">
                <Circle className="h-4 w-4" />
                <span>Círculo</span>
              </div>
            </SelectItem>
            <SelectItem value="SQUARE">
              <div className="flex items-center space-x-2">
                <Square className="h-4 w-4" />
                <span>Cuadrada</span>
              </div>
            </SelectItem>
            <SelectItem value="RECTANGLE">
              <div className="flex items-center space-x-2">
                <RectangleHorizontal className="h-4 w-4" />
                <span>Rectangular</span>
              </div>
            </SelectItem>
            <SelectItem value="WIDE">
              <div className="flex items-center space-x-2">
                <RectangleVertical className="h-4 w-4" />
                <span>Barra</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Cambia la forma de la mesa
        </p>
      </div>

      <div>
        <Label
          htmlFor="edit-capacity"
          className="text-xs text-muted-foreground mb-2 block"
        >
          Capacidad
        </Label>
        <Select
          value={selectedTable.capacity.toString()}
          onValueChange={(value) =>
            onUpdateCapacity(selectedTable.id, Number.parseInt(value))
          }
          disabled={isLocked}
        >
          <SelectTrigger id="edit-capacity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 4, 6, 8, 10, 12].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{num} comensales</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Número máximo de comensales
        </p>
      </div>

      <div>
        <Label
          htmlFor="edit-size"
          className="text-xs text-muted-foreground mb-2 block"
        >
          Tamaño
        </Label>
        <Select
          value={
            // Determine if table is "big" by checking if width is close to normal default (80/180/380)
            // or big size (90/190/390). Use midpoint (85/185/385) as threshold
            selectedTable.width >
            (selectedTable.shape === "WIDE"
              ? 385 // Midpoint between 380 (normal) and 390 (big)
              : selectedTable.shape === "RECTANGLE"
              ? 185 // Midpoint between 180 (normal) and 190 (big)
              : 85) // Midpoint between 80 (normal) and 90 (big)
              ? "big"
              : "normal"
          }
          onValueChange={(value: "normal" | "big") =>
            onUpdateSize(selectedTable.id, value)
          }
          disabled={!isEditMode || isLocked}
        >
          <SelectTrigger id="edit-size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal (80x80)</SelectItem>
            <SelectItem value="big">Grande (90x90)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Cambia el tamaño de la mesa
        </p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          Estado
        </Label>
        <Select
          value={selectedTable.status}
          onValueChange={(value) =>
            onUpdateStatus(selectedTable.id, value as TableStatus)
          }
          disabled={isLocked}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="empty">Disponible</SelectItem>
            <SelectItem value="occupied">Ocupada</SelectItem>
            <SelectItem value="reserved">Reservada</SelectItem>
            {/* <SelectItem value="cleaning">Limpiando</SelectItem> */}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Cambios manuales anulan el estado calculado de reservas
        </p>
      </div>

      <div className="flex items-center space-x-2 py-2">
        <Checkbox
          id="edit-is-shared"
          checked={selectedTable.isShared ?? false}
          onCheckedChange={(checked) =>
            onUpdateIsShared(selectedTable.id, checked === true)
          }
          disabled={isLocked}
        />
        <Label
          htmlFor="edit-is-shared"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Mesa compartida
        </Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Permite múltiples reservas simultáneas
      </p>

      {isEditMode && (
        <div className="pt-4 space-y-2">
          {(selectedTable.shape === "RECTANGLE" ||
            selectedTable.shape === "WIDE") && (
            <Button
              onClick={() => onRotate(selectedTable.id)}
              variant="outline"
              className="w-full"
              size="sm"
              disabled={isLocked}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Rotar 90°
            </Button>
          )}
          <Button
            onClick={() => onDelete(selectedTable.id)}
            variant="destructive"
            className="w-full"
            size="sm"
            disabled={isLocked}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Mesa
          </Button>
        </div>
      )}
      {!isEditMode && (
        <p className="text-xs text-muted-foreground text-center pt-4 pb-2">
          Activa el modo edición para modificar la mesa
        </p>
      )}
    </div>
  );
}
