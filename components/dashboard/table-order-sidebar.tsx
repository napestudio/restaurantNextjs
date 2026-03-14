"use client";

import {
  addOrderItems,
  closeEmptyTable,
  createTableOrder,
  getAvailableTablesForMove,
  moveOrderToTable,
  removeOrderItem,
  updateDiscount,
} from "@/actions/Order";
import { setTablesPaying, setTablesOccupied } from "@/actions/Table";
import { getClientByEmail, type ClientData } from "@/actions/clients";
import { usePrint } from "@/hooks/use-print";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/contexts/products-context";
import { useOrdersData } from "@/hooks/use-orders-data";
import { ArrowRightLeft, Check, DollarSign, Edit, Percent, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClientPicker } from "./client-picker";
import { CloseTableDialog } from "./close-table-dialog";
import { CommittedOrderItemsList } from "./committed-order-items-list";
import { CreateClientDialog } from "./create-client-dialog";
import { EditOrderDialog } from "./edit-order-dialog";
import { MoveOrderDialog } from "./move-order-dialog";
import { OrderTabs } from "./order-tabs";
import { PreOrderItemsList, type PreOrderItem } from "./pre-order-items-list";
import { ProductPicker } from "./product-picker";
import { WaiterPicker } from "./waiter-picker";
import { useToast } from "@/hooks/use-toast";
import { OrderProduct } from "@/types/products";
import { formatCurrency } from "@/lib/currency";

interface TableOrderSidebarProps {
  tableId: string | null;
  tableNumber: number | null;
  tableIsShared?: boolean;
  tableSectorId?: string | null;
  branchId: string;
  onClose: () => void;
  onTableChange?: (tableId: string) => void;
  onOrderUpdated: (tableId: string) => void;
  initialPartySize?: number;
  initialCustomerEmail?: string;
}

export function TableOrderSidebar({
  tableId,
  tableNumber,
  tableIsShared = false,
  tableSectorId,
  branchId,
  onClose,
  onTableChange,
  onOrderUpdated,
  initialPartySize,
  initialCustomerEmail,
}: TableOrderSidebarProps) {
  const [partySize, setPartySize] = useState(
    initialPartySize?.toString() ?? "",
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const hasAutoSelectedRef = useRef(false);
  // Track previous tableId to detect genuine table changes (Strict Mode safe)
  const prevTableIdRef = useRef<string | null | undefined>(undefined);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [showEditOrderDialog, setShowEditOrderDialog] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountTypeInput, setDiscountTypeInput] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [availableTables, setAvailableTables] = useState<
    Array<{
      id: string;
      number: number;
      name: string | null;
      capacity: number;
      isShared: boolean;
      sectorId: string | null;
    }>
  >([]);

  // Pre-order state: items that haven't been confirmed/added to the actual order yet
  const [preOrderItems, setPreOrderItems] = useState<PreOrderItem[]>([]);

  // Use cached products from context
  const {
    products,
    isLoading: productsLoading,
    refreshProducts,
  } = useProducts();

  // Load products on mount if not already loaded (mirrors create-order-sidebar pattern)
  useEffect(() => {
    if (products.length === 0 && !productsLoading) {
      refreshProducts();
    }
  }, [products.length, productsLoading, refreshProducts]);

  // gg-ez-print printing
  const { printOrderItems, printControlTicket, isPrinting } = usePrint();
  const { toast } = useToast();

  // Use SWR for order data fetching with auto-refresh
  const {
    orders: allOrders,
    order: singleOrder,
    isLoading: isLoadingOrders,
    refresh,
    mutate,
  } = useOrdersData({
    tableId,
    isShared: tableIsShared,
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true, // Refresh when tab becomes visible
    revalidateOnReconnect: true, // Refresh when network reconnects
    focusThrottleInterval: 30000, // Don't re-fetch on focus more often than the poll interval
  });

  // Derive current order from allOrders (for shared) or singleOrder (for non-shared)
  const order = useMemo(() => {
    return tableIsShared
      ? (Array.isArray(allOrders)
          ? allOrders.find((o) => o.id === selectedOrderId)
          : null) || null
      : singleOrder;
  }, [tableIsShared, allOrders, selectedOrderId, singleOrder]);

  // Combined loading state
  const isLoading = isLoadingOrders || isLoadingAction;

  // Show loading indicator only on true initial load (cold cache, data=undefined).
  // Background revalidations (isValidating) are silent — no spinner on tab switch or 30s poll.
  const showLoadingIndicator = isLoadingOrders && !order;

  // Reset state when table genuinely changes (Strict Mode safe: skip initial mount and re-runs with same tableId)
  useEffect(() => {
    const prevTableId = prevTableIdRef.current;
    prevTableIdRef.current = tableId;
    // undefined = initial mount; same value = Strict Mode double-invocation → skip both
    if (prevTableId === undefined || prevTableId === tableId) return;
    if (tableId) {
      setPartySize("");
      setSelectedOrderId(null);
      hasAutoSelectedRef.current = false;
      setSelectedClient(null);
      setSelectedWaiterId(null);
      setClientSearchQuery("");
    }
  }, [tableId]);

  // On mount: look up registered client by reservation email (if provided)
  useEffect(() => {
    if (!initialCustomerEmail || !branchId) return;
    getClientByEmail(branchId, initialCustomerEmail).then((result) => {
      if (result.success && result.data) setSelectedClient(result.data);
    });
  }, []); // mount only — eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first order when orders load
  useEffect(() => {
    if (
      tableIsShared &&
      Array.isArray(allOrders) &&
      allOrders.length > 0 &&
      !selectedOrderId &&
      !hasAutoSelectedRef.current
    ) {
      setSelectedOrderId(allOrders[0].id);
      hasAutoSelectedRef.current = true;
    }
  }, [tableIsShared, allOrders, selectedOrderId]);

  // Update party size when an active order with a saved partySize is loaded.
  // Only override when the order actually has a value — otherwise preserve
  // whatever was pre-filled (e.g. from a reservation's people count).
  useEffect(() => {
    if (order?.partySize) {
      setPartySize(order.partySize.toString());
    }
  }, [order]);

  const handleCreateOrder = async () => {
    if (!tableId || !partySize || parseInt(partySize) <= 0) {
      alert("Por favor ingresa el número de comensales");
      return;
    }

    setIsLoadingAction(true);
    const result = await createTableOrder(
      tableId,
      branchId,
      parseInt(partySize),
      selectedClient?.id || null,
      selectedWaiterId || null,
    );

    if (result.success && result.data) {
      // Refresh orders data with SWR
      await refresh();

      // Select the newly created order
      setSelectedOrderId(result.data.id);

      // Reset form inputs for next order
      setPartySize("");
      setSelectedClient(null);
      setSelectedWaiterId(null);
      setClientSearchQuery("");

      // Update table status
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al crear la orden");
    }
    setIsLoadingAction(false);
  };

  const handleCreateNewClient = (searchQuery: string) => {
    setClientSearchQuery(searchQuery);
    setShowCreateClientDialog(true);
  };

  const handleClientCreated = (client: ClientData) => {
    setSelectedClient(client);
    setShowCreateClientDialog(false);
  };

  const handleSelectProduct = (product: OrderProduct) => {
    // Add to pre-order state instead of directly to order
    setPreOrderItems((prev) => [
      ...prev,
      {
        productId: product.id,
        itemName: product.name,
        quantity: 1,
        price: Number(product.price),
        originalPrice: Number(product.price),
        notes: undefined,
        categoryId: product.categoryId,
      },
    ]);
  };

  const handleUpdatePreOrderItem = (index: number, item: PreOrderItem) => {
    setPreOrderItems((prev) =>
      prev.map((existingItem, i) => (i === index ? item : existingItem)),
    );
  };

  const handleRemovePreOrderItem = (index: number) => {
    setPreOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmPreOrder = async () => {
    if (!order || !tableId || preOrderItems.length === 0) return;

    setIsLoadingAction(true);

    // Store items to print before clearing
    const itemsToPrint = [...preOrderItems];

    // Add all pre-order items to the actual order (bulk operation - single DB call)
    const result = await addOrderItems(order.id, preOrderItems);

    if (!result.success) {
      alert(result.error || "Error al agregar los productos");
      setIsLoadingAction(false);
      return;
    }

    // Auto-print the newly added items via gg-ez-print (station comandas - no prices, no waiter)
    const tableName = tableNumber?.toString() || "—";

    // Fire and forget - printing happens in background via gg-ez-print
    printOrderItems(
      {
        orderId: order.id,
        orderCode: order.publicCode,
        tableName,
        branchId,
      },
      itemsToPrint.map((item) => ({
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        notes: item.notes,
        categoryId: item.categoryId,
      })),
    );

    // If table was in PAYING state, revert to OCCUPIED since new items were added
    await setTablesOccupied([tableId]);

    // Clear pre-order items after successful confirmation
    setPreOrderItems([]);

    // Trigger background revalidation (non-blocking for instant UI responsiveness)
    // SWR will sync data automatically within 2s (dedupe) or 30s (polling)
    mutate(undefined, { revalidate: true });
    onOrderUpdated(tableId);
    setIsLoadingAction(false);
  };

  // Remove price and quantity editing for committed items - they can only be removed

  const handleRemoveItem = async (itemId: string) => {
    if (!tableId || !order) return;

    // Optimistic update - the SWR cache will be updated on next refresh
    // For now we just proceed without loading state
    const result = await removeOrderItem(itemId);

    if (result.success) {
      await refresh();
      onOrderUpdated(tableId);
    } else {
      // Rollback by refreshing to get server state
      await refresh();
      alert(result.error || "Error al eliminar el producto");
    }
  };

  const handleCloseTable = async () => {
    if (!order || !tableId) return;

    // If order has no items, delete it directly and free the table
    if (!order.items || order.items.length === 0) {
      if (
        !confirm("¿Cerrar mesa sin productos? La orden vacía será eliminada.")
      ) {
        return;
      }

      setIsLoadingAction(true);
      const result = await closeEmptyTable(order.id);
      setIsLoadingAction(false);

      if (result.success) {
        await handleCloseTableSuccess(tableId);
      } else {
        alert(result.error || "Error al cerrar la mesa");
      }
      return;
    }

    // Open the close table dialog instead of directly closing
    setShowCloseDialog(true);
  };

  const handleCloseTableSuccess = async (closedTableId: string) => {
    onOrderUpdated(closedTableId);

    if (tableIsShared) {
      // Refresh to get updated orders list
      await refresh();

      // Check if there are more active orders after refresh
      const remainingOrders = Array.isArray(allOrders)
        ? allOrders.filter((o) => o.id !== order?.id)
        : [];

      if (remainingOrders.length > 0) {
        // Switch to the first remaining order
        setSelectedOrderId(remainingOrders[0].id);
      } else {
        // Last order closed, close sidebar
        onClose();
      }
    } else {
      // Explicitly clear the SWR cache so keepPreviousData doesn't
      // return this closed order if the same table is reopened later.
      mutate(null);
      onClose();
    }
  };

  const handlePrintCheck = async () => {
    if (!order || !order.items) return;

    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const waiterName =
      order.assignedTo?.name || order.assignedTo?.username || "—";
    const tableName = tableNumber?.toString() || "—";

    // Print via gg-ez-print - optimistic updates handled by usePrint hook
    const success = await printControlTicket({
      orderId: order.id,
      orderCode: order.publicCode,
      tableName,
      waiterName,
      branchId,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        notes: item.notes,
      })),
      subtotal,
      discountPercentage: order.discountPercentage
        ? Number(order.discountPercentage)
        : undefined,
      discountType: order.discountPercentage
        ? String(order.discountType)
        : undefined,
      orderType: order.type,
      customerName: order.client?.name,
      orderCreatedAt: order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : order.createdAt,
    });

    if (success) {
      if (tableId) {
        await setTablesPaying([tableId]);
        onOrderUpdated(tableId);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error de impresión",
        description:
          "No se pudo imprimir el ticket. Verifica que gg-ez-print esté ejecutándose y que haya impresoras configuradas.",
      });
    }
  };

  const handleOpenMoveDialog = async () => {
    setIsLoadingAction(true);
    const tables = await getAvailableTablesForMove(branchId);
    setAvailableTables(tables);
    setShowMoveDialog(true);
    setIsLoadingAction(false);
  };

  const handleMoveOrder = async (targetTableId: string) => {
    if (!order || !tableId) return;

    // Close dialog immediately
    setShowMoveDialog(false);

    // Execute server action FIRST
    const result = await moveOrderToTable(order.id, targetTableId);

    // THEN refresh tables AFTER database is updated
    if (result.success) {
      onOrderUpdated(tableId); // Refresh source table
      onOrderUpdated(targetTableId); // Refresh target table

      // Switch to destination table instead of closing
      if (onTableChange) {
        onTableChange(targetTableId);
      } else {
        onClose(); // Fallback to closing if callback not provided
      }
    } else {
      console.error("Failed to move order:", result.error);
      toast({
        title: "Error al mover la orden",
        description: result.error || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  const handleDiscountEdit = () => {
    if (!order) return;
    setDiscountInput(Number(order.discountPercentage).toString());
    setDiscountTypeInput((order.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE");
    setIsEditingDiscount(true);
  };

  const handleDiscountSave = async () => {
    if (!order) return;

    const newDiscount = parseFloat(discountInput);
    if (isNaN(newDiscount) || newDiscount < 0) {
      alert("El descuento no puede ser negativo");
      return;
    }
    if (discountTypeInput === "PERCENTAGE" && newDiscount > 100) {
      alert("El descuento porcentual debe estar entre 0 y 100");
      return;
    }

    // Store previous values for rollback
    const previousDiscount = Number(order.discountPercentage);
    const previousType = (order.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE";

    // Perform server update (keep editor open)
    const result = await updateDiscount(order.id, newDiscount, discountTypeInput);

    if (result.success) {
      setIsEditingDiscount(false);
      refresh();
    } else {
      setDiscountInput(previousDiscount.toString());
      setDiscountTypeInput(previousType);
      alert(result.error || "Error al actualizar el descuento");
    }
  };

  const handleDiscountCancel = () => {
    setIsEditingDiscount(false);
    setDiscountInput("");
    setDiscountTypeInput("PERCENTAGE");
  };

  if (!tableId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-neutral-50 overflow-hidden relative">
      <div className="flex flex-row items-center justify-between shrink-0 bg-red-500 shadow-sm">
        <div className="flex items-center gap-2 px-2 py-1 text-white">
          <div className="text-xl">
            Mesa {tableNumber}
            {tableIsShared && (
              <span className="ml-2 text-sm font-norma">(Compartida)</span>
            )}
            {order?.client?.name && (
              <span className="ml-2 text-sm font-normal opacity-90">— {order.client.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh()}
            disabled={isLoading}
            title="Actualizar datos"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          {order && (
            <button
              onClick={() => setShowEditOrderDialog(true)}
              className="w-max text-white cursor-pointer"
              disabled={isLoading}
            >
              <Edit className="w-4" />
            </button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-2">
        {/* Order Tabs for Shared Tables */}
        {Array.isArray(allOrders) && allOrders.length > 0 && (
          <OrderTabs
            orders={allOrders.map((o) => ({
              id: o.id,
              partySize: o.partySize,
              status: o.status,
              items: o.items.map((item) => ({
                id: item.id,
                itemName: item.product.name,
                quantity: item.quantity,
                price: item.price,
                originalPrice: item.originalPrice,
              })),
            }))}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onCreateOrder={() => {
              // Reset to create new order
              setPartySize("");
              setSelectedOrderId(null);
            }}
            disabled={isLoading}
          />
        )}

        {/* Party Size - Show loading or form when no active order */}
        {showLoadingIndicator ? (
          <div className="space-y-2 mb-4 flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : !order ? (
          <div className="space-y-2 mb-4">
            <Label htmlFor="party-size">
              Personas <span className="text-red-500">*</span>
            </Label>
            <NumberInput
              id="party-size"
              min="1"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && partySize && parseInt(partySize) > 0) {
                  handleCreateOrder();
                }
              }}
              placeholder="Ej: 4"
              disabled={isLoading}
              autoFocus
            />
          </div>
        ) : null}

        {/* Client Picker - Show loading or form when no active order */}
        {showLoadingIndicator ? null : !order ? (
          <div className="mb-4">
            <ClientPicker
              branchId={branchId}
              selectedClient={selectedClient}
              onSelectClient={setSelectedClient}
              onCreateNew={handleCreateNewClient}
              disabled={isLoading}
            />
          </div>
        ) : null}

        {/* Waiter Picker - Show loading or form when no active order */}
        {showLoadingIndicator ? null : !order ? (
          <div className="mb-4">
            <WaiterPicker
              branchId={branchId}
              selectedWaiterId={selectedWaiterId}
              onSelectWaiter={setSelectedWaiterId}
              disabled={isLoading}
            />
          </div>
        ) : null}

        {/* Open Table Button */}
        {!order && partySize && parseInt(partySize) > 0 && (
          <Button
            onClick={handleCreateOrder}
            disabled={isLoading}
            className="w-full"
          >
            Abrir Mesa
          </Button>
        )}

        {/* Only show product picker and items if order exists */}
        {order && (
          <div className="flex flex-col flex-1 min-h-0 gap-4">
            {/* Product Picker - Fixed at top */}
            <div className="shrink-0">
              <ProductPicker
                products={products}
                onSelectProduct={handleSelectProduct}
                onSubmitPreOrder={
                  preOrderItems.length > 0 ? handleConfirmPreOrder : undefined
                }
                label="ADICIONAR"
                placeholder="Buscar producto..."
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Pre-Order Items (editable with notes) - scrollable, footer pinned absolutely */}
            {preOrderItems.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto pb-27.5">
                <PreOrderItemsList
                  items={preOrderItems}
                  onUpdateItem={handleUpdatePreOrderItem}
                  onRemoveItem={handleRemovePreOrderItem}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Committed Order Items (read-only, can only remove) - SCROLLABLE */}
            {order.items?.length > 0 && preOrderItems.length === 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <CommittedOrderItemsList
                  items={
                    order.items?.map((item) => ({
                      id: item.id,
                      itemName: item.product.name,
                      quantity: item.quantity,
                      price: item.price,
                      originalPrice: item.originalPrice,
                      notes: item.notes,
                    })) || []
                  }
                  onRemoveItem={handleRemoveItem}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Action Buttons - Fixed at bottom */}
            {preOrderItems.length === 0 && (
              <div className="flex gap-2 pt-4 border-t flex-wrap shrink-0">
                <Button
                  onClick={handlePrintCheck}
                  variant="outline"
                  disabled={isPrinting}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="128"
                    height="128"
                    viewBox="0 0 48 48"
                  >
                    <g fill="none" stroke="currentColor" strokeWidth="4">
                      <path
                        strokeLinecap="round"
                        d="M38 20V8a2 2 0 0 0-2-2H12a2 2 0 0 0-2 2v12"
                      />
                      <rect width="36" height="22" x="6" y="20" rx="2" />
                      <path
                        fill="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 34h15v8H20z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 26h3"
                      />
                    </g>
                  </svg>
                  {/* Imprimir Cuenta */}
                </Button>

                <Button
                  onClick={handleOpenMoveDialog}
                  variant="outline"
                  disabled={isLoading}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  {/* Mover a Otra Mesa */}
                </Button>

                {/* Discount Button/Editor */}
                {isEditingDiscount ? (
                  <div className="flex items-center gap-1 bg-white rounded px-2">
                    <Button
                      type="button"
                      variant={discountTypeInput === "PERCENTAGE" ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setDiscountTypeInput("PERCENTAGE")}
                    >
                      <Percent className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant={discountTypeInput === "FIXED" ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setDiscountTypeInput("FIXED")}
                    >
                      <DollarSign className="h-3 w-3" />
                    </Button>
                    <NumberInput
                      min="0"
                      max={discountTypeInput === "PERCENTAGE" ? "100" : undefined}
                      step="0.01"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleDiscountSave();
                      }}
                      className="h-8 w-16 text-sm"
                      placeholder={discountTypeInput === "PERCENTAGE" ? "%" : "$"}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleDiscountSave}
                      disabled={isLoadingAction}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={handleDiscountCancel}
                      disabled={isLoadingAction}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleDiscountEdit}
                    variant={
                      Number(order.discountPercentage) > 0
                        ? "default"
                        : "outline"
                    }
                    disabled={isLoading}
                    title={
                      Number(order.discountPercentage) > 0
                        ? `Descuento: ${order.discountType === "FIXED" ? formatCurrency(Number(order.discountPercentage)) : `${Number(order.discountPercentage)}%`}`
                        : "Agregar descuento"
                    }
                  >
                    <Percent className="h-4 w-4" />
                    {Number(order.discountPercentage) > 0 && (
                      <span className="ml-1 text-xs">
                        {order.discountType === "FIXED"
                          ? `-${formatCurrency(Number(order.discountPercentage))}`
                          : `-${Number(order.discountPercentage)}%`}
                      </span>
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleCloseTable}
                  className="bg-red-500"
                  disabled={isLoading}
                >
                  {!order.items || order.items.length === 0
                    ? "Eliminar Orden Vacia"
                    : "Cerrar Mesa"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pre-Order Footer - always pinned at bottom */}
      {preOrderItems.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-neutral-50 border-t p-2 flex flex-col gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-center font-bold text-base">
            <span>Total a confirmar:</span>
            <span>
              {formatCurrency(
                preOrderItems.reduce(
                  (sum, item) => sum + item.quantity * item.price,
                  0,
                ),
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPreOrderItems([])}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPreOrder}
              className="flex-1"
              disabled={isLoading}
            >
              Confirmar
            </Button>
          </div>
        </div>
      )}

      {/* Move Order Dialog */}
      <MoveOrderDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        availableTables={availableTables}
        currentTableNumber={tableNumber}
        onConfirm={handleMoveOrder}
        isLoading={isLoading}
      />

      {/* Close Table Dialog */}
      {order && tableId && tableNumber && (
        <CloseTableDialog
          open={showCloseDialog}
          onOpenChange={setShowCloseDialog}
          order={{
            id: order.id,
            publicCode: order.publicCode,
            partySize: order.partySize,
            discountPercentage: Number(order.discountPercentage),
            discountType: String(order.discountType || "PERCENTAGE"),
            items:
              order.items?.map((item) => ({
                id: item.id,
                itemName: item.product?.name,
                quantity: item.quantity,
                price: item.price,
                originalPrice: item.originalPrice,
                product: item.product,
              })) || [],
          }}
          tableNumber={tableNumber}
          branchId={branchId}
          tableId={tableId}
          tableSectorId={tableSectorId}
          onSuccess={handleCloseTableSuccess}
        />
      )}

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        branchId={branchId}
        onSuccess={handleClientCreated}
        initialName={clientSearchQuery}
      />

      {/* Edit Order Dialog */}
      {order && (
        <EditOrderDialog
          open={showEditOrderDialog}
          onOpenChange={setShowEditOrderDialog}
          orderId={order.id}
          branchId={branchId}
          currentPartySize={order.partySize || 1}
          currentClientId={order.clientId}
          currentClient={
            order.client
              ? {
                  id: order.client.id,
                  name: order.client.name,
                  email: order.client.email,
                }
              : null
          }
          currentWaiterId={order.assignedToId}
          onSuccess={() => {
            refresh();
            if (tableId) onOrderUpdated(tableId);
          }}
          disabled={isLoading}
        />
      )}
    </div>
  );
}
