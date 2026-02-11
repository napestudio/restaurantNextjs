"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { CartItem } from "./delivery-page-client";

interface ShoppingCartProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  deliveryFee: number;
  onBack: () => void;
  onCheckout: () => void;
}

export function ShoppingCart({
  cart,
  onUpdateQuantity,
  onRemove,
  deliveryFee,
  onBack,
  onCheckout,
}: ShoppingCartProps) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <Card className="bg-white text-black">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500 mb-4">Tu carrito está vacío</p>
          <Button onClick={onBack}>Volver al Menú</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="text-black">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h2 className="text-2xl font-bold">Tu Carrito</h2>
      </div>

      <Card className="bg-white text-black">
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 pb-4 border-b last:border-0"
            >
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">
                  ${item.price.toFixed(2)} c/u
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    onUpdateQuantity(item.productId, item.quantity - 1)
                  }
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    onUpdateQuantity(item.productId, item.quantity + 1)
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-24 text-right font-semibold">
                ${(item.price * item.quantity).toFixed(2)}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(item.productId)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white text-black">
        <CardContent className="pt-6 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Costo de envío</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onCheckout} size="lg" className="w-full">
        Continuar al Checkout
      </Button>
    </div>
  );
}
