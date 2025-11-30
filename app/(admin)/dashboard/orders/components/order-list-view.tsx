"use client";

import { OrderStatus, OrderType } from "@/app/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Package, Truck, UtensilsCrossed } from "lucide-react";

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

interface OrderListViewProps {
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

export function OrderListView({ orders }: OrderListViewProps) {
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
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mesa/Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Productos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const TypeIcon = typeIcons[order.type];
              const total = calculateTotal(order.items);

              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {order.publicCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {typeLabels[order.type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {order.table ? (
                        <div className="text-gray-900 font-medium">
                          Mesa {order.table.number}
                          {order.table.name && (
                            <span className="text-gray-500 font-normal">
                              {" "}- {order.table.name}
                            </span>
                          )}
                        </div>
                      ) : order.customerName ? (
                        <div className="text-gray-900">{order.customerName}</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                      {order.partySize && (
                        <div className="text-xs text-gray-500">
                          {order.partySize} {order.partySize === 1 ? "persona" : "personas"}
                        </div>
                      )}
                      {order.courierName && (
                        <div className="text-xs text-gray-500">
                          Repartidor: {order.courierName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 font-medium">
                        {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                      </div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">
                        {order.items.map(item => `${item.quantity}x ${item.itemName}`).join(", ")}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: es })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(order.createdAt), "HH:mm", { locale: es })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={statusColors[order.status]} variant="outline">
                      {statusLabels[order.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900">
                      ${total.toFixed(2)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
