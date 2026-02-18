"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/avatar";
import { ProductList } from "./product-list";
import { ShoppingCart } from "./shopping-cart";
import { CustomerInfoForm } from "./customer-info-form";
import { OrderConfirmation } from "./order-confirmation";
import { OrderProduct } from "@/types/products";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

type WizardStep = "menu" | "cart" | "info" | "confirmation";

type DeliveryConfig = {
  id: string;
  menuId: string | null;
  isActive: boolean;
  minOrderAmount: number;
  deliveryFee: number;
  estimatedMinutes: number;
  menu?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

interface DeliveryPageProps {
  branchId: string;
  config: DeliveryConfig;
  products: OrderProduct[];
  restaurantName: string;
  whatsappUrl: string;
}

export default function DeliveryPage({
  branchId,
  config,
  products,
  restaurantName,
  whatsappUrl,
}: DeliveryPageProps) {
  const [step, setStep] = useState<WizardStep>("menu");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderPublicCode, setOrderPublicCode] = useState<string>("");

  const addToCart = (productId: string, name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { productId, name, price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const deliveryFee = config.deliveryFee || 0;

  const handleOrderComplete = (publicCode: string) => {
    setOrderPublicCode(publicCode);
    setStep("confirmation");
    clearCart();
  };

  const startNewOrder = () => {
    setStep("menu");
    setOrderPublicCode("");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Avatar />
          </div>
          <h1 className="text-4xl font-bold mb-2">Pedidos</h1>
          {config.estimatedMinutes && (
            <p className="text-sm text-gray-500 mt-1">
              Tiempo estimado de entrega: {config.estimatedMinutes} minutos
            </p>
          )}
        </div>

        {/* Step Content */}
        <div className="bg-white p-2 rounded-xl">
          {step === "menu" && (
            <ProductList
              products={products}
              onAddToCart={addToCart}
              onUpdateQuantity={updateQuantity}
              cart={cart}
            />
          )}

          {step === "cart" && (
            <div className="max-w-2xl mx-auto">
              <ShoppingCart
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                deliveryFee={deliveryFee}
                onBack={() => setStep("menu")}
                onCheckout={() => setStep("info")}
              />
            </div>
          )}

          {step === "info" && (
            <div className="max-w-2xl mx-auto">
              <CustomerInfoForm
                branchId={branchId}
                cart={cart}
                deliveryFee={deliveryFee}
                minOrderAmount={config.minOrderAmount || 0}
                onBack={() => setStep("cart")}
                onOrderComplete={handleOrderComplete}
                restaurantName={restaurantName}
                whatsappUrl={whatsappUrl}
              />
            </div>
          )}
          {step === "confirmation" && (
            <div className="max-w-2xl mx-auto">
              <OrderConfirmation
                publicCode={orderPublicCode}
                onStartNewOrder={startNewOrder}
              />
            </div>
          )}
        </div>

        {/* Floating Cart Button (only on menu step) */}
        {step === "menu" && cart.length > 0 && (
          <div className="fixed bottom-6 z-50 w-full flex items-center justify-center">
            <button
              onClick={() => setStep("cart")}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2 shadow-lg flex items-center gap-3 transition-all"
            >
              <span className="font-semibold">Pedido</span>
              <span className="bg-white text-red-500 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </button>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-gray-400 hover:text-white inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
