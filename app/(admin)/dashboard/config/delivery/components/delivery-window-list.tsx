"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";
import { DeliveryWindow, getDayBadges } from "../lib/delivery-windows";

interface DeliveryWindowListProps {
  windows: DeliveryWindow[];
  onEdit: (window: DeliveryWindow) => void;
  onDelete: (id: string) => void;
}

export function DeliveryWindowList({
  windows,
  onEdit,
  onDelete,
}: DeliveryWindowListProps) {
  if (windows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No hay horarios configurados</p>
        <p className="text-sm mt-2">
          Agrega horarios para comenzar a aceptar pedidos de delivery
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {windows.map((window) => (
        <Card key={window.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{window.name}</h3>
                {!window.isActive && (
                  <Badge variant="outline" className="bg-gray-100">
                    Inactivo
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Horario:</span> {window.startTime} -{" "}
                  {window.endTime}
                </p>
                <p>
                  <span className="font-medium">Días:</span>{" "}
                  {getDayBadges(window.daysOfWeek)}
                </p>
                <p>
                  <span className="font-medium">Máximo de órdenes:</span>{" "}
                  {window.maxOrders}
                </p>
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(window)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.id && onDelete(window.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
