"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export type CommittedOrderItem = {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number | null;
  notes?: string | null;
};

interface CommittedOrderItemsListProps {
  items: CommittedOrderItem[];
  onRemoveItem: (itemId: string) => Promise<void>;
  disabled?: boolean;
}

export function CommittedOrderItemsList({
  items,
  onRemoveItem,
  disabled = false,
}: CommittedOrderItemsListProps) {
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No hay productos en la orden
      </div>
    );
  }

  return (
    <div className="space-y-3 flex-1">
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{item.itemName}</div>
              <div className="text-sm text-gray-600 mt-1">
                Cantidad: {item.quantity}
              </div>
              {item.notes && (
                <div className="text-xs text-gray-500 italic mt-1">
                  Nota: {item.notes}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-700">
                ${Number(item.price * item.quantity).toFixed(2)}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600"
                onClick={() => onRemoveItem(item.id)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-3">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total:</span>
          <span>${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
