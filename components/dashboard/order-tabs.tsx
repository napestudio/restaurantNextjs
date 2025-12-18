"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type Order = {
  id: string;
  partySize: number | null;
  items: Array<{
    quantity: number;
    price: number;
  }>;
};

interface OrderTabsProps {
  orders: Order[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  onCreateOrder: () => void;
  disabled?: boolean;
}

export function OrderTabs({
  orders,
  selectedOrderId,
  onSelectOrder,
  onCreateOrder,
  disabled = false,
}: OrderTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const calculateOrderTotal = (order: Order) => {
    return order.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  };

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const newScrollLeft =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScrollButtons);
      }
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [orders]);

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="relative border-b pb-3">
      {/* Left Arrow */}
      {showLeftArrow && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-white shadow-md"
          onClick={() => scroll("left")}
          disabled={disabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-8"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {orders.map((order, index) => {
          const isSelected = order.id === selectedOrderId;
          const total = calculateOrderTotal(order);

          return (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              disabled={disabled}
              className={`
                shrink-0 px-4 py-2 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="text-sm font-semibold text-gray-900">
                Orden #{index + 1}
              </div>
              <div className="text-xs text-gray-600">
                {order.partySize
                  ? `${order.partySize} ${
                      order.partySize === 1 ? "persona" : "personas"
                    }`
                  : "Sin asignar"}
              </div>
              <div className="text-sm font-bold text-gray-900 mt-1">
                ${total.toFixed(2)}
              </div>
            </button>
          );
        })}

        {/* New Order Button */}
        <button
          onClick={onCreateOrder}
          disabled={disabled}
          className={`
            shrink-0 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300
            bg-white hover:border-blue-400 hover:bg-blue-50 transition-all
            flex items-center gap-2
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <Plus className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-600">Nueva Orden</span>
        </button>
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-white shadow-md"
          onClick={() => scroll("right")}
          disabled={disabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Hide scrollbar with CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
