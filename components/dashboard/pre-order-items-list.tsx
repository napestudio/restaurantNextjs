"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, MessageSquare, Minus, Plus } from "lucide-react";

export type PreOrderItem = {
  productId: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number;
  notes?: string;
  categoryId?: string | null;
};

interface PreOrderItemsListProps {
  items: PreOrderItem[];
  onUpdateItem: (index: number, item: PreOrderItem) => void;
  onRemoveItem: (index: number) => void;
  disabled?: boolean;
}

export function PreOrderItemsList({
  items,
  onUpdateItem,
  onRemoveItem,
  disabled = false,
}: PreOrderItemsListProps) {
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  const handleQuantityChange = (index: number, delta: number) => {
    const item = items[index];
    const newQuantity = item.quantity + delta;
    if (newQuantity >= 1) {
      onUpdateItem(index, { ...item, quantity: newQuantity });
    }
  };

  const handlePriceChange = (index: number, newPrice: string) => {
    const item = items[index];
    const price = parseFloat(newPrice);
    if (!isNaN(price) && price >= 0) {
      onUpdateItem(index, { ...item, price });
    }
  };

  const handleNotesClick = (index: number) => {
    setEditingNotes(index);
    setTempNotes(items[index].notes || "");
  };

  const handleNotesSave = (index: number) => {
    const item = items[index];
    onUpdateItem(index, { ...item, notes: tempNotes || undefined });
    setEditingNotes(null);
    setTempNotes("");
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No hay productos en la pre-orden
      </div>
    );
  }

  return (
    <div className="space-y-3 flex-1">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item.productId}-${index}`}
            className="flex flex-col gap-2 p-3 rounded-lg border-2"
          >
            {/* Header row with quantity controls */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.itemName}</div>

                {/* Quantity Controls */}
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleQuantityChange(index, -1)}
                      disabled={disabled || item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value);
                        if (!isNaN(newQuantity) && newQuantity >= 1) {
                          onUpdateItem(index, {
                            ...item,
                            quantity: newQuantity,
                          });
                        }
                      }}
                      className="w-14 h-7 text-center text-sm"
                      disabled={disabled}
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleQuantityChange(index, 1)}
                      disabled={disabled}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Notes section */}

                  <div className="flex items-start gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNotesClick(index)}
                      disabled={disabled || editingNotes === index}
                      className="h-7"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Editable price */}
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handlePriceChange(index, e.target.value)}
                    className="w-20 h-8 text-sm"
                    disabled={disabled}
                  />
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                  onClick={() => onRemoveItem(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {editingNotes === index && (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="Notas especiales (ej: sin azúcar, extra picante...)"
                  className="text-sm resize-none h-20"
                  autoFocus
                  disabled={disabled}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleNotesSave(index)}
                    disabled={disabled}
                    className="flex-1"
                  >
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingNotes(null);
                      setTempNotes("");
                    }}
                    disabled={disabled}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            {item.notes && (
              <p className="text-xs text-gray-600 italic flex-1">
                {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t pt-3 bg-white sticky bottom-0">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total a confirmar:</span>
          <span>${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
