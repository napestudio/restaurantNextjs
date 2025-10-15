"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2, Calendar, Users } from "lucide-react";
import type { TimeSlot } from "@/app/(admin)/dashboard/reservations/slots/lib/time-slots";
import {
  formatTime,
  getDayBadges,
} from "@/app/(admin)/dashboard/reservations/slots/lib/utils";

interface TimeSlotsTableProps {
  timeSlots: TimeSlot[];
  onDelete: (slotId: string) => void;
  onCreateClick: () => void;
}

export function TimeSlotsTable({
  timeSlots,
  onDelete,
  onCreateClick,
}: TimeSlotsTableProps) {
  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Todos los Turnos</CardTitle>
          <CardDescription>Administra los turnos</CardDescription>
        </CardHeader>
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
    <Card>
      <CardHeader>
        <CardTitle>Todos los Turnos</CardTitle>
        <CardDescription>Administra los turnos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {timeSlots.map((slot) => (
            <Card key={slot.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-bold text-lg">
                          {formatTime(slot.timeFrom)} -{" "}
                          {formatTime(slot.timeTo)}
                        </span>
                      </div>

                      {slot.price > 0 ? (
                        <Badge variant="default" className="bg-green-600">
                          ${slot.price}/<Users />
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Gratis</Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {getDayBadges(slot.days)}
                      </span>
                    </div>

                    {slot.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        📝 {slot.notes}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(slot.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
