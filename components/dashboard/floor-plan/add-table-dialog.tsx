import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  Circle,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";
import type { TableShapeType } from "@/types/table";

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: string;
  tableName?: string;
  tableShape: TableShapeType;
  tableCapacity: string;
  isShared: boolean;
  onTableNumberChange: (value: string) => void;
  onTableNameChange?: (value: string) => void;
  onTableShapeChange: (value: TableShapeType) => void;
  onTableCapacityChange: (value: string) => void;
  onIsSharedChange: (value: boolean) => void;
  onAddTable: () => void;
}

export function AddTableDialog({
  open,
  onOpenChange,
  tableNumber,
  tableName,
  tableShape,
  tableCapacity,
  isShared,
  onTableNumberChange,
  onTableNameChange,
  onTableShapeChange,
  onTableCapacityChange,
  onIsSharedChange,
  onAddTable,
}: AddTableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nueva Mesa</DialogTitle>
          <DialogDescription>
            Agrega una nueva mesa a tu plano del salón
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="table-number">Número de Mesa *</Label>
            <Input
              id="table-number"
              type="number"
              value={tableNumber}
              onChange={(e) => onTableNumberChange(e.target.value)}
              placeholder="1, 2, 3..."
              required
            />
          </div>

          {/* <div>
            <Label htmlFor="table-name">Nombre de Mesa (Opcional)</Label>
            <Input
              id="table-name"
              value={tableName || ""}
              onChange={(e) => onTableNameChange?.(e.target.value)}
              placeholder={`Si se deja vacío, se usará el número "${
                tableNumber || ""
              }"`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ejemplo: Barra Central
            </p>
          </div> */}

          <div>
            <Label htmlFor="table-shape">Forma de la Mesa</Label>
            <Select value={tableShape} onValueChange={onTableShapeChange}>
              <SelectTrigger>
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
          </div>

          <div>
            <Label htmlFor="table-capacity">Capacidad</Label>
            <Select value={tableCapacity} onValueChange={onTableCapacityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "comensal" : "comensales"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-shared"
              checked={isShared}
              onCheckedChange={(checked) => onIsSharedChange(checked === true)}
            />
            <Label
              htmlFor="is-shared"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mesa compartida (puede tener múltiples reservas)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onAddTable} className="bg-red-600 hover:bg-red-700">
            Agregar Mesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
