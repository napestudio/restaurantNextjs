"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface OrderConfirmationProps {
  publicCode: string;
  onStartNewOrder: () => void;
}

export function OrderConfirmation({
  publicCode,
  onStartNewOrder,
}: OrderConfirmationProps) {
  return (
    <Card className="bg-white text-black text-center py-12">
      <CardContent className="space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="h-8 w-8 text-white" />
        </div>

        <div>
          <h2 className="text-3xl font-bold mb-2">¡Pedido Confirmado!</h2>
          <p className="text-gray-600">
            Tu pedido ha sido recibido y está siendo preparado
          </p>
        </div>

        <div className="bg-gray-100 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Número de Pedido</p>
          <p className="text-2xl font-bold font-mono">{publicCode}</p>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>Te hemos enviado la confirmación por email</p>
          <p>Puedes consultar el estado de tu pedido con este número</p>
        </div>

        <Button onClick={onStartNewOrder} size="lg" className="w-full">
          Hacer Otro Pedido
        </Button>
      </CardContent>
    </Card>
  );
}
