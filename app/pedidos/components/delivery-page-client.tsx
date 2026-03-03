"use client";

import { useState } from "react";
import { ArrowLeft, Car, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/avatar";
import { ProductList } from "./product-list";
import { ShoppingCart } from "./shopping-cart";
import { CustomerInfoForm } from "./customer-info-form";
import { OrderConfirmation } from "./order-confirmation";
import { OrderProduct, DeliverySection } from "@/types/products";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

export type SelectedOrderType = "DELIVERY" | "TAKE_AWAY";

type WizardStep = "orderType" | "menu" | "cart" | "info" | "confirmation";

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
  sections?: DeliverySection[];
  takeawayProducts: OrderProduct[];
  takeawaySections: DeliverySection[];
  allowDelivery: boolean;
  allowTakeAway: boolean;
  restaurantName: string;
  whatsappUrl: string;
}

export default function DeliveryPage({
  branchId,
  config,
  products,
  sections,
  takeawayProducts,
  takeawaySections,
  allowDelivery,
  allowTakeAway,
  restaurantName,
  whatsappUrl,
}: DeliveryPageProps) {
  const bothEnabled = allowDelivery && allowTakeAway;

  const [step, setStep] = useState<WizardStep>(bothEnabled ? "orderType" : "menu");
  const [selectedOrderType, setSelectedOrderType] = useState<SelectedOrderType>(
    allowDelivery ? "DELIVERY" : "TAKE_AWAY"
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderPublicCode, setOrderPublicCode] = useState<string>("");
  const [whatsappOrderUrl, setWhatsappOrderUrl] = useState<string>("");

  // Pick the active product set based on the selected order type
  const activeProducts = selectedOrderType === "TAKE_AWAY" ? takeawayProducts : products;
  const activeSections = selectedOrderType === "TAKE_AWAY" ? takeawaySections : (sections ?? []);

  // Delivery fee only applies to DELIVERY orders
  const effectiveDeliveryFee = selectedOrderType === "TAKE_AWAY" ? 0 : (config.deliveryFee || 0);

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

  const handleOrderComplete = (publicCode: string, url: string) => {
    setOrderPublicCode(publicCode);
    setWhatsappOrderUrl(url);
    setStep("confirmation");
    clearCart();
  };

  const startNewOrder = () => {
    setStep(bothEnabled ? "orderType" : "menu");
    setOrderPublicCode("");
    if (bothEnabled) {
      setSelectedOrderType(allowDelivery ? "DELIVERY" : "TAKE_AWAY");
    }
  };

  const selectOrderType = (type: SelectedOrderType) => {
    setSelectedOrderType(type);
    // Clear cart when switching type to avoid price mismatches
    setCart([]);
    setStep("menu");
  };

  return (
    <div className="min-h-svh bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Avatar />
          </div>
          <h1 className="text-4xl font-bold mb-2">Pedidos</h1>
          {config.estimatedMinutes && step !== "orderType" && (
            <p className="text-sm text-gray-500 mt-1">
              {selectedOrderType === "TAKE_AWAY"
                ? `Tiempo estimado de preparación: ${config.estimatedMinutes} minutos`
                : `Tiempo estimado de entrega: ${config.estimatedMinutes} minutos`}
            </p>
          )}
        </div>

        {/* Step Content */}
        <div className="bg-white p-2 rounded-xl">
          {/* Order type selection step */}
          {step === "orderType" && (
            <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900 text-center">
                ¿Cómo querés recibir tu pedido?
              </h2>
              <div className="grid gap-4">
                <button
                  onClick={() => selectOrderType("DELIVERY")}
                  className="flex items-center gap-4 p-6 rounded-xl border-2 border-gray-200 hover:border-purple-700 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <Car className="h-7 w-7 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-neutral-900">Delivery</p>
                    <p className="text-sm text-gray-500">Lo enviamos a tu domicilio</p>
                    {config.deliveryFee > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Costo de envío: ${config.deliveryFee.toFixed(2)}
                      </p>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => selectOrderType("TAKE_AWAY")}
                  className="flex items-center gap-4 p-6 rounded-xl border-2 border-gray-200 hover:border-purple-700 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <ShoppingBag className="h-7 w-7 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-neutral-900">Retiro en local</p>
                    <p className="text-sm text-gray-500">Pasás a buscarlo al local</p>
                    <p className="text-xs text-gray-400 mt-1">Sin costo de envío</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === "menu" && (
            <ProductList
              products={activeProducts}
              sections={activeSections}
              onAddToCart={addToCart}
              onUpdateQuantity={updateQuantity}
              cart={cart}
            />
          )}

          {step === "cart" && (
            <div className="max-w-2xl mx-auto">
              <ShoppingCart
                cart={cart}
                products={activeProducts}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                deliveryFee={effectiveDeliveryFee}
                orderType={selectedOrderType}
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
                deliveryFee={effectiveDeliveryFee}
                minOrderAmount={config.minOrderAmount || 0}
                orderType={selectedOrderType}
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
                whatsappUrl={whatsappOrderUrl}
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
