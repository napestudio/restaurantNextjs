"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

type AvailableTable = {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  isShared: boolean;
  sectorId: string | null;
};

interface MoveOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTables: AvailableTable[];
  currentTableNumber: number | null;
  onConfirm: (targetTableId: string) => Promise<void>;
  isLoading: boolean;
}

export function MoveOrderDialog({
  open,
  onOpenChange,
  availableTables,
  currentTableNumber,
  onConfirm,
  isLoading,
}: MoveOrderDialogProps) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selectedTableId) return;
    await onConfirm(selectedTableId);
    setSelectedTableId(null);
  };

  const handleCancel = () => {
    setSelectedTableId(null);
    onOpenChange(false);
  };

  const selectedTable = availableTables.find(
    (table) => table.id === selectedTableId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Mover Orden a Otra Mesa</DialogTitle>
          <DialogDescription>
            Selecciona la mesa de destino para mover esta orden. Solo se
            muestran mesas disponibles (libres y sin reservas activas).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current and target table display */}
          {selectedTableId && (
            <div className="flex items-center justify-center gap-4 py-2 px-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Desde</div>
                <div className="text-lg font-bold">
                  Mesa {currentTableNumber}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Hacia</div>
                <div className="text-lg font-bold">
                  Mesa {selectedTable?.number}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mesas Disponibles ({availableTables.length})</Label>
            {availableTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay mesas disponibles en este momento
              </div>
            ) : (
              <ScrollArea className="h-75 rounded-md border">
                <div className="p-4 space-y-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {availableTables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTableId(table.id)}
                      disabled={isLoading}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTableId === table.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2 justify-between md:justify-center">
                        <div>
                          <div className="flex items-center flex-col justify-center gap-2">
                            <span className="font-semibold text-lg">
                              Mesa {table.number}
                            </span>
                            {table.name && (
                              <span className="text-sm text-muted-foreground">
                                ({table.name})
                              </span>
                            )}
                            {table.isShared && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Compartida
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedTableId === table.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-primary-foreground"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTableId || isLoading}
          >
            {isLoading ? "Moviendo..." : "Mover Orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
