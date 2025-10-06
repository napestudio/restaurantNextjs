"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import type { SerializedReservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";

interface ViewReservationDialogProps {
  reservation: SerializedReservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewReservationDialog({
  reservation,
  open,
  onOpenChange,
}: ViewReservationDialogProps) {
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const variants = {
      confirmed: "default",
      pending: "secondary",
      canceled: "destructive",
      cancelled: "destructive",
    };
    return (
      <Badge
        variant={
          (variants[statusLower as keyof typeof variants] || "default") as
            | "default"
            | "secondary"
            | "destructive"
            | "outline"
        }
      >
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reservation Details</DialogTitle>
          <DialogDescription>
            Complete information for reservation #{reservation?.id}
          </DialogDescription>
        </DialogHeader>
        {reservation && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Customer Name
                </h3>
                <p className="text-lg font-semibold">{reservation.customerName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Status
                </h3>
                <div>{getStatusBadge(reservation.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Email
                </h3>
                <p className="text-sm">{reservation.customerEmail}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Phone
                </h3>
                <p className="text-sm">{reservation.customerPhone || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
                <p className="text-sm font-semibold">
                  {format(parseISO(reservation.date), 'MMMM dd, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Time</h3>
                <p className="text-sm font-semibold">
                  {reservation.timeSlot
                    ? `${reservation.timeSlot.startTime.slice(11, 16)} - ${reservation.timeSlot.endTime.slice(11, 16)}`
                    : 'No time slot'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Party Size
                </h3>
                <p className="text-sm font-semibold">
                  {reservation.people} guests
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Dietary Restrictions
                </h3>
                <p className="text-sm bg-orange-50 p-3 rounded-md border border-orange-200">
                  {reservation.dietaryRestrictions || "None"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Accessibility Needs
                </h3>
                <p className="text-sm bg-blue-50 p-3 rounded-md border border-blue-200">
                  {reservation.accessibilityNeeds || "None"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Special Requests / Notes
              </h3>
              <p className="text-sm bg-gray-50 p-3 rounded-md">
                {reservation.notes || "No special requests"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Created On
              </h3>
              <p className="text-sm">
                {format(parseISO(reservation.createdAt), 'MMM dd, yyyy hh:mm a')}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
