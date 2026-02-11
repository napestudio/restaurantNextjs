"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Copy, AlertTriangle } from "lucide-react";
import type {
  UnitType,
  WeightUnit,
  VolumeUnit,
  PriceType,
} from "@/app/generated/prisma";

type SerializedProductPrice = {
  id: string;
  productOnBranchId: string;
  type: PriceType;
  price: number;
};

type SerializedProductOnBranch = {
  id: string;
  productId: string;
  branchId: string;
  stock: number;
  minStock: number | null;
  maxStock: number | null;
  lastRestocked: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  prices: SerializedProductPrice[];
};

type SerializedCategory = {
  id: string;
  name: string;
  order: number;
  restaurantId: string;
};

type MenuItemWithRelations = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  unitType: UnitType;
  weightUnit: WeightUnit | null;
  volumeUnit: VolumeUnit | null;
  minStockAlert: number | null;
  trackStock: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  categoryId: string | null;
  category: SerializedCategory | null;
  branches: SerializedProductOnBranch[];
};

type MenuItemsTableProps = {
  items: MenuItemWithRelations[];
  branchId: string;
  onEdit: (item: MenuItemWithRelations) => void;
  onDelete: (item: MenuItemWithRelations) => void;
  onDuplicate: (item: MenuItemWithRelations) => void;
};

export function MenuItemsTable({
  items,
  branchId,
  onEdit,
  onDelete,
  onDuplicate,
}: MenuItemsTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Precio Comedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  No se encontraron productos
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const branchData = item.branches.find(
                  (b) => b.branchId === branchId
                );
                const stock = branchData?.stock ?? 0;
                const dineInPrice = branchData?.prices.find(
                  (p) => p.type === "DINE_IN"
                );
                const hasLowStock =
                  item.trackStock &&
                  item.minStockAlert &&
                  stock < item.minStockAlert;
                const isOutOfStock = item.trackStock && stock === 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.category?.name || (
                        <span className="text-gray-400">Sin categoría</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!item.trackStock ? (
                        <Badge variant="outline" className="bg-green-50">
                          N/A
                        </Badge>
                      ) : (
                        <span
                          className={
                            isOutOfStock
                              ? "text-red-600 font-semibold"
                              : hasLowStock
                              ? "text-yellow-600"
                              : ""
                          }
                        >
                          {stock}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {dineInPrice ? `$${dineInPrice.price.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {!item.trackStock && (
                        <Badge variant="outline" className="bg-green-50">
                          Siempre Disponible
                        </Badge>
                      )}
                      {isOutOfStock && (
                        <Badge variant="destructive">Sin Stock</Badge>
                      )}
                      {!isOutOfStock && hasLowStock && (
                        <Badge className="gap-1 bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="h-3 w-3" />
                          Bajo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(item)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDuplicate(item)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(item)}
                          title="Eliminar"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
