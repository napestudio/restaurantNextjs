"use client";

import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem, SelectedOrderType } from "./delivery-page-client";
import { OrderProduct } from "@/types/products";

interface ShoppingCartProps {
  cart: CartItem[];
  products: OrderProduct[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  deliveryFee: number;
  orderType: SelectedOrderType;
  onBack: () => void;
  onCheckout: () => void;
}

export function ShoppingCart({
  cart,
  products,
  onUpdateQuantity,
  onRemove,
  deliveryFee,
  orderType,
  onBack,
  onCheckout,
}: ShoppingCartProps) {
  const isDelivery = orderType === "DELIVERY";
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = subtotal + (isDelivery ? deliveryFee : 0);

  if (cart.length === 0) {
    return (
      <Card className="bg-white text-black">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500 mb-4">Tu carrito está vacío</p>
          <Button onClick={onBack}>Elegir productos</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center pt-3 gap-4">
        <h2 className="text-2xl text-neutral-900 font-bold">Tu Pedido</h2>
      </div>

      <Card className="bg-white text-black">
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const isAtLimit = product
              ? product.trackStock && item.quantity >= product.stock
              : false;
            return (
              <div
                key={item.productId}
                className="flex md:items-center md:flex-row flex-col gap-4 pb-4 border-b last:border-0"
              >
                <div className="flex justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.price)}{" "}
                      c/u
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(item.productId)}
                    className="text-red-500 hover:text-red-700 block md:hidden text-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                    disabled={isAtLimit}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="w-24 text-right font-semibold">
                  {formatCurrency(item.price * item.quantity)}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.productId)}
                  className="text-red-500 hover:text-red-700 hidden md:block text-center"
                >
                  <Trash2 className="h-4 w-4 mx-auto" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-white text-black">
        <CardContent className="pt-6 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>
              {formatCurrency(subtotal)}
            </span>
          </div>
          {isDelivery && deliveryFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Costo de envío</span>
              <span>
                {formatCurrency(deliveryFee)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Total</span>
            <span>
              {formatCurrency(total)}
            </span>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Button
          onClick={onCheckout}
          className="w-full bg-purple-900 hover:bg-purple-900/90 transition-colors text-xl py-6"
        >
          Finalizar pedido
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          className="text-black w-full"
        >
          Agregar productos
        </Button>
      </div>
    </div>
  );
}
