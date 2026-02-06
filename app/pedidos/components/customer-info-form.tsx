"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getClientByEmail, createClient } from "@/actions/clients";
import { createOrderWithItems } from "@/actions/Order";
import { OrderType } from "@/app/generated/prisma";
import { CartItem } from "./delivery-page-client";

interface CustomerInfoFormProps {
  branchId: string;
  cart: CartItem[];
  deliveryFee: number;
  minOrderAmount: number;
  onBack: () => void;
  onOrderComplete: (publicCode: string) => void;
}

export function CustomerInfoForm({
  branchId,
  cart,
  deliveryFee,
  minOrderAmount,
  onBack,
  onOrderComplete,
}: CustomerInfoFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    addressStreet: "",
    addressNumber: "",
    addressApartment: "",
    addressCity: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes("@")) return;

    try {
      const result = await getClientByEmail(branchId, formData.email);
      if (result.success && result.data) {
        // Pre-fill form with existing client data
        setFormData((prev) => ({
          ...prev,
          name: result.data!.name || prev.name,
          phone: result.data!.phone || prev.phone,
          addressStreet: result.data!.addressStreet || prev.addressStreet,
          addressNumber: result.data!.addressNumber || prev.addressNumber,
          addressApartment: result.data!.addressApartment || prev.addressApartment,
          addressCity: result.data!.addressCity || prev.addressCity,
        }));
        toast({
          title: "Cliente encontrado",
          description: "Los datos del cliente se han cargado automáticamente",
        });
      }
    } catch (error) {
      // Silent fail - client doesn't exist yet
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (!formData.addressStreet || !formData.addressNumber || !formData.addressCity) {
      toast({
        title: "Dirección incompleta",
        description: "Por favor completa la dirección de entrega",
        variant: "destructive",
      });
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (minOrderAmount > 0 && subtotal < minOrderAmount) {
      toast({
        title: "Monto mínimo no alcanzado",
        description: `El monto mínimo de pedido es $${minOrderAmount.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        // 1. Find or create client
        let clientResult = await getClientByEmail(branchId, formData.email);
        let clientId: string;

        if (!clientResult.success || !clientResult.data) {
          // Create new client
          const newClientResult = await createClient({
            branchId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            addressStreet: formData.addressStreet,
            addressNumber: formData.addressNumber,
            addressApartment: formData.addressApartment,
            addressCity: formData.addressCity,
          });

          if (!newClientResult.success) {
            toast({
              title: "Error",
              description: "Error al crear cliente",
              variant: "destructive",
            });
            return;
          }

          clientId = newClientResult.data!.id;
        } else {
          clientId = clientResult.data.id;
        }

        // 2. Create order with items
        const orderResult = await createOrderWithItems({
          branchId,
          type: OrderType.DELIVERY,
          clientId,
          description: formData.notes || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            itemName: item.name,
            quantity: item.quantity,
            price: item.price,
            originalPrice: item.price,
            notes: item.notes,
          })),
        });

        if (orderResult.success && orderResult.data) {
          toast({
            title: "¡Pedido creado!",
            description: "Tu pedido ha sido confirmado exitosamente",
          });
          onOrderComplete(orderResult.data.publicCode);
        } else {
          toast({
            title: "Error al crear pedido",
            description: orderResult.error || "Error al crear pedido",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error creating order:", error);
        toast({
          title: "Error",
          description: "Error al procesar el pedido",
          variant: "destructive",
        });
      }
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + deliveryFee;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="text-black"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h2 className="text-2xl font-bold">Información de Entrega</h2>
      </div>

      <Card className="bg-white text-black">
        <CardHeader>
          <CardTitle>Datos de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleEmailBlur}
              required
            />
            <p className="text-sm text-gray-500">
              Te enviaremos la confirmación del pedido
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white text-black">
        <CardHeader>
          <CardTitle>Dirección de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addressStreet">Calle *</Label>
              <Input
                id="addressStreet"
                name="addressStreet"
                value={formData.addressStreet}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNumber">Número *</Label>
              <Input
                id="addressNumber"
                name="addressNumber"
                value={formData.addressNumber}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addressApartment">Piso/Depto (opcional)</Label>
              <Input
                id="addressApartment"
                name="addressApartment"
                value={formData.addressApartment}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressCity">Ciudad *</Label>
              <Input
                id="addressCity"
                name="addressCity"
                value={formData.addressCity}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Instrucciones de Entrega (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Ej: Timbre del primer piso, portón negro"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white text-black">
        <CardHeader>
          <CardTitle>Resumen del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.name}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Procesando..." : "Confirmar Pedido"}
      </Button>
    </form>
  );
}
