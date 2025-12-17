"use client";

import type { TimeSlot } from "@/app/(admin)/dashboard/config/slots/lib/time-slots";
import {
  formatTime,
  getDayBadges,
} from "@/app/(admin)/dashboard/config/slots/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Pencil, Plus, Trash2, Users } from "lucide-react";

interface TimeSlotsTableProps {
  timeSlots: TimeSlot[];
  onDelete: (slotId: string) => void;
  onEdit: (slotId: string) => void;
  onCreateClick: () => void;
}

export function TimeSlotsTable({
  timeSlots,
  onDelete,
  onEdit,
  onCreateClick,
}: TimeSlotsTableProps) {
  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay turnos creados
            </h3>
            <p className="text-gray-600 mb-4">
              Crea turnos para comeenzar a aceptar reservas.
            </p>
            <Button
              onClick={onCreateClick}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Turno
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {timeSlots.map((slot) => (
        <Card key={slot.id} className="border-gray-200 p-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-xl">{slot.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-bold text-lg">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>

                  {slot.pricePerPerson && slot.pricePerPerson > 0 ? (
                    <Badge variant="default" className="bg-green-600">
                      ${slot.pricePerPerson}/<Users />
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Gratis</Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {getDayBadges(slot.daysOfWeek)}
                  </span>
                </div>

                {slot.notes && (
                  <p className="text-sm text-gray-600 mt-2">📝 {slot.notes}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(slot.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(slot.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
