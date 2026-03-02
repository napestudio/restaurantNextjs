"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";

interface OrderConfirmationProps {
  publicCode: string;
  whatsappUrl: string;
  onStartNewOrder: () => void;
}

export function OrderConfirmation({
  publicCode,
  whatsappUrl,
  onStartNewOrder,
}: OrderConfirmationProps) {
  return (
    <Card className="bg-white text-black text-center py-12">
      <CardContent className="space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="h-8 w-8 text-white" />
        </div>

        <div>
          <h2 className="text-3xl font-bold mb-2">¡Pedido Pendiente!</h2>
          <p className="text-gray-600">
            Te redirigiremos a WhatsApp para completar tu pedido y realizar el
            pago.
          </p>
        </div>

        <div className="bg-gray-100 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Número de Pedido</p>
          <p className="text-2xl font-bold font-mono">{publicCode}</p>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>Una vez abonado, tu pedido será confirmado.</p>
        </div>

        {whatsappUrl && (
          <>
            <p className="mb-0 text-sm text-gray-500 italic">
              Si la redirección no funciona haga click aqui
            </p>
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full rounded-md bg-green-500 hover:bg-green-600 text-white font-semibold text-lg py-1 transition-colors"
            >
              Abrir WhatsApp
            </Link>
          </>
        )}

        <Button onClick={onStartNewOrder} size="lg" className="w-full">
          Hacer Otro Pedido
        </Button>
      </CardContent>
    </Card>
  );
}
