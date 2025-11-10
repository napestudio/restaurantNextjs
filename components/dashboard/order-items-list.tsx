"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus } from "lucide-react";

export type OrderItemType = {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number | null;
};

interface OrderItemsListProps {
  items: OrderItemType[];
  onUpdatePrice: (itemId: string, price: number) => Promise<void>;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  disabled?: boolean;
}

export function OrderItemsList({
  items,
  onUpdatePrice,
  onUpdateQuantity,
  onRemoveItem,
  disabled = false,
}: OrderItemsListProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState("");

  const handlePriceClick = (itemId: string, currentPrice: number) => {
    setEditingItemId(itemId);
    setTempPrice(currentPrice.toString());
  };

  const handlePriceChange = async (itemId: string) => {
    const newPrice = parseFloat(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      await onUpdatePrice(itemId, newPrice);
    }
    setEditingItemId(null);
    setTempPrice("");
  };

  const handlePriceBlur = (itemId: string) => {
    handlePriceChange(itemId);
  };

  const handlePriceKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string
  ) => {
    if (e.key === "Enter") {
      handlePriceChange(itemId);
    } else if (e.key === "Escape") {
      setEditingItemId(null);
      setTempPrice("");
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      await onUpdateQuantity(itemId, newQuantity);
    }
  };

  const handleQuantityInputChange = (itemId: string, value: string) => {
    setTempQuantity(value);
  };

  const handleQuantityInputBlur = async (itemId: string) => {
    const newQuantity = parseInt(tempQuantity);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      await onUpdateQuantity(itemId, newQuantity);
    }
    setEditingQuantityId(null);
    setTempQuantity("");
  };

  const handleQuantityKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string
  ) => {
    if (e.key === "Enter") {
      handleQuantityInputBlur(itemId);
    } else if (e.key === "Escape") {
      setEditingQuantityId(null);
      setTempQuantity("");
    }
  };

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
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{item.itemName}</div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  disabled={disabled || item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>

                {editingQuantityId === item.id ? (
                  <Input
                    type="number"
                    min="1"
                    value={tempQuantity}
                    onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                    onBlur={() => handleQuantityInputBlur(item.id)}
                    onKeyDown={(e) => handleQuantityKeyDown(e, item.id)}
                    className="w-14 h-7 text-center text-sm"
                    autoFocus
                    disabled={disabled}
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingQuantityId(item.id);
                      setTempQuantity(item.quantity.toString());
                    }}
                    className="w-14 h-7 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
                    disabled={disabled}
                  >
                    {item.quantity}
                  </button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  disabled={disabled}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div>
                {editingItemId === item.id ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    onBlur={() => handlePriceBlur(item.id)}
                    onKeyDown={(e) => handlePriceKeyDown(e, item.id)}
                    className="w-20 h-8 text-sm"
                    autoFocus
                    disabled={disabled}
                  />
                ) : (
                  <button
                    onClick={() => handlePriceClick(item.id, item.price)}
                    className="w-20 h-8 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded border border-gray-300 px-2"
                    disabled={disabled}
                  >
                    ${Number(item.price).toFixed(2)}
                  </button>
                )}
                {item.originalPrice && item.price !== item.originalPrice && (
                  <div className="text-xs text-amber-600 mt-1 w-full text-right">
                    ${Number(item.originalPrice).toFixed(2)}
                  </div>
                )}
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
