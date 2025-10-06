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
import type { Reservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";

interface ViewReservationDialogProps {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewReservationDialog({
  reservation,
  open,
  onOpenChange,
}: ViewReservationDialogProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      confirmed: "default",
      pending: "secondary",
      cancelled: "destructive",
    };
    return (
      <Badge
        variant={
          (variants[status as keyof typeof variants] || "default") as
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
                <p className="text-lg font-semibold">{reservation.name}</p>
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
                <p className="text-sm">{reservation.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Phone
                </h3>
                <p className="text-sm">{reservation.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
                <p className="text-sm font-semibold">{reservation.date}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Time</h3>
                <p className="text-sm font-semibold">{reservation.time}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Party Size
                </h3>
                <p className="text-sm font-semibold">
                  {reservation.guests} guests
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
              <p className="text-sm">{reservation.createdAt}</p>
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
