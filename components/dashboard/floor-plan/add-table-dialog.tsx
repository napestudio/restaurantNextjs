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
import { Circle, Square, RectangleHorizontal } from "lucide-react";

type TableShapeType = "CIRCLE" | "SQUARE" | "RECTANGLE";

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: string;
  tableShape: TableShapeType;
  tableCapacity: string;
  onTableNumberChange: (value: string) => void;
  onTableShapeChange: (value: TableShapeType) => void;
  onTableCapacityChange: (value: string) => void;
  onAddTable: () => void;
}

export function AddTableDialog({
  open,
  onOpenChange,
  tableNumber,
  tableShape,
  tableCapacity,
  onTableNumberChange,
  onTableShapeChange,
  onTableCapacityChange,
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
            <Label htmlFor="table-number">Número de Mesa</Label>
            <Input
              id="table-number"
              value={tableNumber}
              onChange={(e) => onTableNumberChange(e.target.value)}
              placeholder="ej: T1, T2, A1"
            />
          </div>

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
                    <span>Círculo (2 asientos)</span>
                  </div>
                </SelectItem>
                <SelectItem value="SQUARE">
                  <div className="flex items-center space-x-2">
                    <Square className="h-4 w-4" />
                    <span>Cuadrada (4 asientos)</span>
                  </div>
                </SelectItem>
                <SelectItem value="RECTANGLE">
                  <div className="flex items-center space-x-2">
                    <RectangleHorizontal className="h-4 w-4" />
                    <span>Rectangular (6+ asientos)</span>
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
                {[2, 4, 6, 8, 10, 12].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} comensales
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
