"use client";

import { OrderStatus, OrderType } from "@/app/generated/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, MapPin, User, Package, Truck, UtensilsCrossed } from "lucide-react";

type Order = {
  id: string;
  publicCode: string;
  type: OrderType;
  status: OrderStatus;
  customerName: string | null;
  customerEmail: string | null;
  partySize: number | null;
  description: string | null;
  courierName: string | null;
  createdAt: Date;
  tableId: string | null;
  paymentMethod: string;
  discountPercentage: number;
  needsInvoice: boolean;
  assignedToId: string | null;
  table: {
    number: number;
    name: string | null;
  } | null;
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    price: number;
    originalPrice: number | null;
  }>;
};

interface OrderGridViewProps {
  orders: Order[];
}

const statusColors = {
  [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.CANCELED]: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  [OrderStatus.PENDING]: "Pendiente",
  [OrderStatus.IN_PROGRESS]: "En Progreso",
  [OrderStatus.COMPLETED]: "Completada",
  [OrderStatus.CANCELED]: "Cancelada",
};

const typeIcons = {
  [OrderType.DINE_IN]: UtensilsCrossed,
  [OrderType.TAKE_AWAY]: Package,
  [OrderType.DELIVERY]: Truck,
};

const typeLabels = {
  [OrderType.DINE_IN]: "Para Comer Aquí",
  [OrderType.TAKE_AWAY]: "Para Llevar",
  [OrderType.DELIVERY]: "Delivery",
};

export function OrderGridView({ orders }: OrderGridViewProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes</h3>
        <p className="text-gray-500">No se encontraron órdenes con los filtros seleccionados.</p>
      </div>
    );
  }

  const calculateTotal = (items: Order["items"]) => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {orders.map((order) => {
        const TypeIcon = typeIcons[order.type];
        const total = calculateTotal(order.items);

        return (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold">
                    {order.publicCode}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <TypeIcon className="h-4 w-4" />
                    <span>{typeLabels[order.type]}</span>
                  </div>
                </div>
                <Badge className={statusColors[order.status]} variant="outline">
                  {statusLabels[order.status]}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Time */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  {format(new Date(order.createdAt), "PPp", { locale: es })}
                </span>
              </div>

              {/* Table Info (for dine-in) */}
              {order.table && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Mesa {order.table.number}
                    {order.table.name ? ` - ${order.table.name}` : ""}
                  </span>
                </div>
              )}

              {/* Party Size */}
              {order.partySize && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {order.partySize} {order.partySize === 1 ? "persona" : "personas"}
                  </span>
                </div>
              )}

              {/* Customer Name */}
              {order.customerName && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Cliente: </span>
                  <span className="text-gray-600">{order.customerName}</span>
                </div>
              )}

              {/* Courier Name (for delivery) */}
              {order.courierName && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Repartidor: </span>
                  <span className="text-gray-600">{order.courierName}</span>
                </div>
              )}

              {/* Items Summary */}
              <div className="pt-3 border-t">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Productos ({order.items.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}x {item.itemName}
                      </span>
                      <span className="font-medium text-gray-900">
                        ${(item.quantity * item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-gray-900">
                  ${total.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
