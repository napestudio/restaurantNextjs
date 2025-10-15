import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCw,
  Trash2,
  Maximize2,
  Users,
  Circle,
  Square,
  RectangleHorizontal,
} from "lucide-react";

type TableShapeType = "CIRCLE" | "SQUARE" | "RECTANGLE";
type TableStatus = "empty" | "occupied" | "reserved" | "cleaning";

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
}

interface TablePropertiesPanelProps {
  selectedTable: FloorTable | undefined;
  onUpdateShape: (tableId: string, shape: TableShapeType) => void;
  onUpdateCapacity: (tableId: string, capacity: number) => void;
  onUpdateStatus: (tableId: string, status: TableStatus) => void;
  onRotate: (tableId: string) => void;
  onDelete: (tableId: string) => void;
}

export function TablePropertiesPanel({
  selectedTable,
  onUpdateShape,
  onUpdateCapacity,
  onUpdateStatus,
  onRotate,
  onDelete,
}: TablePropertiesPanelProps) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Propiedades de la Mesa</CardTitle>
        <CardDescription>
          {selectedTable
            ? `Mesa ${selectedTable.number}`
            : "Selecciona una mesa para editar"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedTable ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                Número de Mesa
              </Label>
              <div className="text-lg font-bold">{selectedTable.number}</div>
            </div>

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
              <Label className="text-xs text-muted-foreground mb-2 block">
                Estado
              </Label>
              <Select
                value={selectedTable.status}
                onValueChange={(value) =>
                  onUpdateStatus(selectedTable.id, value as TableStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Disponible</SelectItem>
                  <SelectItem value="occupied">Ocupada</SelectItem>
                  <SelectItem value="reserved">Reservada</SelectItem>
                  <SelectItem value="cleaning">Limpiando</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Posición</Label>
              <div className="text-sm mt-1">
                X: {Math.round(selectedTable.x)}, Y:{" "}
                {Math.round(selectedTable.y)}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Rotación</Label>
              <div className="text-sm mt-1">{selectedTable.rotation}°</div>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={() => onRotate(selectedTable.id)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotar 45°
              </Button>
              <Button
                onClick={() => onDelete(selectedTable.id)}
                variant="destructive"
                className="w-full"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Mesa
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Maximize2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Haz clic en una mesa para ver y editar sus propiedades
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
