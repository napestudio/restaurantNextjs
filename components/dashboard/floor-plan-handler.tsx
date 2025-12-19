"use client";

import { createTable } from "@/actions/Table";
import { tableHasActiveOrders } from "@/actions/Order";
import type { TableShapeType } from "@/types/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TableWithReservations } from "@/lib/floor-plan-utils";
import { shapeDefaults } from "@/lib/floor-plan-utils";
import { GRID_SIZE } from "@/lib/floor-plan-constants";
import { useFloorPlanState } from "@/hooks/use-floor-plan-state";
import { useFloorPlanActions } from "@/hooks/use-floor-plan-actions";
import { AddTableDialog } from "./floor-plan/add-table-dialog";
import { FloorPlanCanvas } from "./floor-plan/floor-plan-canvas";
import { FloorPlanActions } from "./floor-plan/floor-plan-actions";
import { TablePropertiesPanel } from "./floor-plan/table-properties-panel";
import { SectorSelector, type Sector } from "./floor-plan/sector-selector";
import { TableOrderSidebar } from "./table-order-sidebar";

// Default canvas dimensions - can be overridden by sector dimensions
const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 800;

interface FloorPlanPageProps {
  branchId: string;
  tables: TableWithReservations[];
  setTables: React.Dispatch<React.SetStateAction<TableWithReservations[]>>;
  selectedSector?: string | null;
  setSelectedSector?: (sectorId: string | null) => void;
  sectors?: Sector[];
  onAddSector?: () => void;
  onEditSector?: (sector: Sector) => void;
  onRefreshTables?: () => Promise<void>;
  onRefreshSingleTable?: (tableId: string) => Promise<void>;
}

export default function FloorPlanHandler({
  branchId,
  tables: dbTables,
  setTables: setDbTables,
  selectedSector: externalSelectedSector,
  setSelectedSector: externalSetSelectedSector,
  sectors: externalSectors = [],
  onAddSector,
  onEditSector,
  onRefreshTables,
  onRefreshSingleTable,
}: FloorPlanPageProps) {
  // UI State
  const [zoom, setZoom] = useState(0.75);
  const [showGrid, setShowGrid] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<
    string | null
  >(null);
  const [selectedTableHasOrders, setSelectedTableHasOrders] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Use external sectors and selectedSector
  const sectors = externalSectors;
  const selectedSector = externalSelectedSector ?? null;

  // Get canvas dimensions from selected sector or use defaults
  const { canvasWidth, canvasHeight } = useMemo(() => {
    const currentSector = selectedSector
      ? sectors.find((s) => s.id === selectedSector)
      : null;
    return {
      canvasWidth: currentSector?.width ?? DEFAULT_CANVAS_WIDTH,
      canvasHeight: currentSector?.height ?? DEFAULT_CANVAS_HEIGHT,
    };
  }, [selectedSector, sectors]);

  // Use custom hook for floor plan state management
  const {
    tables,
    setTables,
    filteredTables,
    selectedTable,
    setSelectedTable,
    selectedTableData,
    draggedTable,
    setDraggedTable,
    setDragOffset,
    handleTableDrag,
  } = useFloorPlanState({
    dbTables,
    selectedSector: selectedSector ?? null,
    canvasWidth,
    canvasHeight,
    zoom,
  });

  // Use custom hook for table actions
  const {
    deleteTable,
    rotateTable,
    updateTableStatus,
    updateTableCapacity,
    updateTableShape,
    updateTableIsShared,
    updateTableSize,
    saveFloorPlanChanges,
  } = useFloorPlanActions({
    tables,
    setTables,
    setDbTables,
    setSelectedTable,
    setHasUnsavedChanges,
  });

  // New table form state
  const [newTable, setNewTable] = useState({
    number: "",
    name: "",
    shape: "SQUARE" as TableShapeType,
    capacity: "2",
    isShared: false,
    sectorId: selectedSector || "",
  });

  // Check if selected table has active orders
  useEffect(() => {
    const checkActiveOrders = async () => {
      if (selectedTable) {
        const result = await tableHasActiveOrders(selectedTable);
        if (result.success) {
          setSelectedTableHasOrders(result.hasActiveOrders);
        } else {
          setSelectedTableHasOrders(false);
        }
      } else {
        setSelectedTableHasOrders(false);
      }
    };

    checkActiveOrders();
  }, [selectedTable]);

  // Handle table mouse down - memoized
  // Note: table.x and table.y are CENTER coordinates
  const handleTableMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      e.stopPropagation();

      // In edit mode, allow dragging
      if (isEditMode) {
        setSelectedTable(tableId);

        const table = tables.find((t) => t.id === tableId);
        if (!table) return;

        const svg = svgRef.current;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        setDraggedTable(tableId);
        // dragOffset is relative to center (table.x and table.y are center coords)
        setDragOffset({
          x: x - table.x,
          y: y - table.y,
        });
      } else {
        // In view mode, open order sidebar and select table for visual feedback
        setSelectedTable(tableId);
        setSelectedTableForOrder(tableId);
      }
    },
    [isEditMode, tables, zoom, setSelectedTable, setDraggedTable, setDragOffset]
  );

  // Handle mouse move and mouse up for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedTable) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      handleTableDrag(e.clientX, e.clientY, rect);
    };

    const handleMouseUp = () => {
      if (!draggedTable) return;

      // Mark as having unsaved changes instead of saving immediately
      setHasUnsavedChanges(true);
      setDraggedTable(null);
    };

    if (draggedTable) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedTable, handleTableDrag, setDraggedTable]);

  // Add table handler - memoized
  // Note: FloorTable uses center coordinates, DB uses top-left
  const addTable = useCallback(async () => {
    if (!newTable.number) {
      return;
    }

    const defaults = shapeDefaults[newTable.shape];

    // Calculate center position (clickPosition is top-left of grid cell)
    const centerX = clickPosition.x + GRID_SIZE / 2;
    const centerY = clickPosition.y + GRID_SIZE / 2;

    // Convert to top-left for database storage
    const dbPositionX = centerX - defaults.width / 2;
    const dbPositionY = centerY - defaults.height / 2;

    const result = await createTable({
      branchId,
      number: Number.parseInt(newTable.number),
      name: newTable.name || undefined,
      capacity: Number.parseInt(newTable.capacity),
      sectorId: newTable.sectorId || undefined,
      positionX: dbPositionX,
      positionY: dbPositionY,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      shape: newTable.shape,
      isActive: true,
      isShared: newTable.isShared,
    });

    if (result.success && result.data) {
      // Add the new table to local floor plan state (using center coordinates)
      const width = result.data.width ?? defaults.width;
      const height = result.data.height ?? defaults.height;
      const dbX = result.data.positionX ?? dbPositionX;
      const dbY = result.data.positionY ?? dbPositionY;

      const newFloorTable = {
        id: result.data.id,
        number: result.data.number,
        // Convert DB top-left to center for FloorTable
        x: dbX + width / 2,
        y: dbY + height / 2,
        width,
        height,
        rotation: result.data.rotation ?? 0,
        shape: (result.data.shape ?? newTable.shape) as TableShapeType,
        capacity: result.data.capacity,
        status: "empty" as const,
        currentGuests: 0,
        isShared: result.data.isShared ?? false,
      };

      setTables((prevTables) => [...prevTables, newFloorTable]);

      // Also update parent state for simple view (DB format with top-left)
      const newDbTable: TableWithReservations = {
        id: result.data.id,
        number: result.data.number,
        capacity: result.data.capacity,
        positionX: dbX,
        positionY: dbY,
        width,
        height,
        rotation: result.data.rotation ?? 0,
        shape: result.data.shape ?? newTable.shape,
        status: null,
        isActive: result.data.isActive ?? true,
        isShared: result.data.isShared ?? false,
        sectorId: result.data.sectorId ?? null,
        reservations: [],
      };

      setDbTables((prevTables) => [...prevTables, newDbTable]);
      setNewTable({
        number: "",
        name: "",
        shape: "SQUARE",
        capacity: "2",
        isShared: false,
        sectorId: selectedSector || "",
      });
      setAddDialogOpen(false);
    }
  }, [
    newTable,
    branchId,
    setTables,
    setDbTables,
    clickPosition,
    selectedSector,
  ]);

  // Save handler - memoized
  const handleSave = useCallback(() => {
    saveFloorPlanChanges(setIsSaving, setHasUnsavedChanges, setIsEditMode);
  }, [saveFloorPlanChanges]);

  // Zoom handlers - memoized
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(2, prev + 0.1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.5, prev - 0.1));
  }, []);

  // Toggle handlers - memoized
  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
    // Close order sidebar when entering edit mode
    if (!isEditMode) {
      setSelectedTableForOrder(null);
    }
  }, [isEditMode]);

  const handleOrderUpdated = useCallback(
    async (tableId: string) => {
      // Refresh only the specific table that was updated (more efficient)
      if (onRefreshSingleTable) {
        await onRefreshSingleTable(tableId);
      } else if (onRefreshTables) {
        // Fallback to full refresh if single table refresh not available
        await onRefreshTables();
      }
    },
    [onRefreshSingleTable, onRefreshTables]
  );

  const handleCloseSidebar = useCallback(() => {
    setSelectedTableForOrder(null);
  }, []);

  // Handle canvas click to add table
  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      setClickPosition({ x, y });

      // Calculate next available table number
      const existingNumbers = dbTables.map((t) => t.number);
      const maxNumber =
        existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const nextNumber = maxNumber + 1;

      setNewTable((prev) => ({
        ...prev,
        number: nextNumber.toString(),
        sectorId: selectedSector || "",
      }));

      setAddDialogOpen(true);
    },
    [dbTables, selectedSector]
  );

  // Get additional table info for properties panel - memoized
  const selectedDbTable = useMemo(() => {
    return selectedTable
      ? dbTables.find((t) => t.id === selectedTable)
      : undefined;
  }, [selectedTable, dbTables]);

  const selectedTableSector = useMemo(() => {
    return selectedDbTable?.sectorId
      ? sectors.find((s) => s.id === selectedDbTable.sectorId)
      : undefined;
  }, [selectedDbTable?.sectorId, sectors]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 px-2 py-2 bg-neutral-50">
        <SectorSelector
          sectors={sectors}
          selectedSector={selectedSector ?? null}
          onSelectSector={(sectorId) => externalSetSelectedSector?.(sectorId)}
          onAddSector={onAddSector}
          onEditSector={onEditSector}
        />

        <FloorPlanActions
          onSave={handleSave}
          onToggleEditMode={handleToggleEditMode}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isEditMode={isEditMode}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-0 shadow-md">
        {/* Floor Plan Canvas */}
        <div className="lg:col-span-4 relative max-h-svh">
          <FloorPlanCanvas
            tables={filteredTables}
            selectedTable={selectedTable}
            draggedTable={draggedTable}
            zoom={zoom}
            showGrid={showGrid}
            svgRef={svgRef}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isEditMode={isEditMode}
            onTableMouseDown={handleTableMouseDown}
            onCanvasClick={handleCanvasClick}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleGrid={handleToggleGrid}
          />
        </div>

        {/* Right Sidebar - Order Management or Properties Panel */}
        <div className="lg:col-span-2 relative">
          {selectedTableForOrder && !isEditMode ? (
            <TableOrderSidebar
              tableId={selectedTableForOrder}
              tableNumber={
                dbTables.find((t) => t.id === selectedTableForOrder)?.number ??
                null
              }
              tableIsShared={
                dbTables.find((t) => t.id === selectedTableForOrder)
                  ?.isShared ?? false
              }
              tableSectorId={
                dbTables.find((t) => t.id === selectedTableForOrder)
                  ?.sectorId ?? null
              }
              branchId={branchId}
              onClose={handleCloseSidebar}
              onOrderUpdated={handleOrderUpdated}
            />
          ) : (
            <TablePropertiesPanel
              selectedTable={selectedTableData}
              sectorName={selectedTableSector?.name}
              sectorColor={selectedTableSector?.color}
              onUpdateShape={updateTableShape}
              onUpdateCapacity={updateTableCapacity}
              onUpdateStatus={updateTableStatus}
              onUpdateIsShared={updateTableIsShared}
              onUpdateSize={updateTableSize}
              onRotate={rotateTable}
              onDelete={deleteTable}
              isEditMode={isEditMode}
              hasActiveOrders={selectedTableHasOrders}
            />
          )}
        </div>
      </div>

      <AddTableDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        tableNumber={newTable.number}
        tableShape={newTable.shape}
        tableCapacity={newTable.capacity}
        isShared={newTable.isShared}
        onTableNumberChange={(value) =>
          setNewTable({ ...newTable, number: value })
        }
        onTableShapeChange={(value) =>
          setNewTable({ ...newTable, shape: value })
        }
        onTableCapacityChange={(value) =>
          setNewTable({ ...newTable, capacity: value })
        }
        onIsSharedChange={(value) =>
          setNewTable({ ...newTable, isShared: value })
        }
        onAddTable={addTable}
      />
    </div>
  );
}
