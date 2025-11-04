"use client";

import { createTable } from "@/actions/Table";
import type { TableShapeType } from "@/types/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TableWithReservations } from "@/lib/floor-plan-utils";
import { shapeDefaults } from "@/lib/floor-plan-utils";
import { useFloorPlanState } from "@/hooks/use-floor-plan-state";
import { useFloorPlanActions } from "@/hooks/use-floor-plan-actions";
import { AddTableDialog } from "./floor-plan/add-table-dialog";
import { FloorPlanCanvas } from "./floor-plan/floor-plan-canvas";
import { FloorPlanToolbar } from "./floor-plan/floor-plan-toolbar";
import { TablePropertiesPanel } from "./floor-plan/table-properties-panel";
import { SectorSelector, type Sector } from "./floor-plan/sector-selector";

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
  onAddTable?: () => void;
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
  onAddTable,
}: FloorPlanPageProps) {
  // UI State
  const [zoom, setZoom] = useState(0.75);
  const [showGrid, setShowGrid] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Use external sectors and selectedSector
  const sectors = externalSectors;
  const selectedSector = externalSelectedSector;

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
    dragOffset,
    setDragOffset,
    handleTableDrag,
  } = useFloorPlanState({
    dbTables,
    selectedSector,
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
    shape: "CIRCLE" as TableShapeType,
    capacity: "2",
    isShared: false,
    sectorId: "",
  });

  // Handle table mouse down - memoized
  const handleTableMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      e.stopPropagation();

      // Always allow selecting tables, but only allow dragging in edit mode
      setSelectedTable(tableId);

      if (!isEditMode) return;

      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      setDraggedTable(tableId);
      setDragOffset({
        x: x - table.x,
        y: y - table.y,
      });
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
  const addTable = useCallback(async () => {
    if (!newTable.number) {
      return;
    }

    const defaults = shapeDefaults[newTable.shape];

    const result = await createTable({
      branchId,
      number: Number.parseInt(newTable.number),
      name: newTable.name || undefined,
      capacity: Number.parseInt(newTable.capacity),
      sectorId: newTable.sectorId || undefined,
      positionX: 50,
      positionY: 50,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      shape: newTable.shape,
      isActive: true,
      isShared: newTable.isShared,
    });

    if (result.success && result.data) {
      // Add the new table to local floor plan state
      const newFloorTable = {
        id: result.data.id,
        number: result.data.number,
        x: result.data.positionX ?? 50,
        y: result.data.positionY ?? 50,
        width: result.data.width ?? defaults.width,
        height: result.data.height ?? defaults.height,
        rotation: result.data.rotation ?? 0,
        shape: (result.data.shape ?? newTable.shape) as TableShapeType,
        capacity: result.data.capacity,
        status: "empty" as const,
        currentGuests: 0,
        isShared: result.data.isShared ?? false,
      };

      setTables((prevTables) => [...prevTables, newFloorTable]);

      // Also update parent state for simple view
      const newDbTable: TableWithReservations = {
        id: result.data.id,
        number: result.data.number,
        capacity: result.data.capacity,
        positionX: result.data.positionX ?? 50,
        positionY: result.data.positionY ?? 50,
        width: result.data.width ?? defaults.width,
        height: result.data.height ?? defaults.height,
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
        shape: "CIRCLE",
        capacity: "2",
        isShared: false,
        sectorId: "",
      });
      setAddDialogOpen(false);
    }
  }, [newTable, branchId, setTables, setDbTables]);

  // Save handler - memoized
  const handleSave = useCallback(() => {
    saveFloorPlanChanges(setIsSaving, setHasUnsavedChanges);
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
  }, []);

  // Get additional table info for properties panel - memoized
  const selectedDbTable = useMemo(() => {
    return selectedTable ? dbTables.find((t) => t.id === selectedTable) : undefined;
  }, [selectedTable, dbTables]);

  const selectedTableSector = useMemo(() => {
    return selectedDbTable?.sectorId
      ? sectors.find((s) => s.id === selectedDbTable.sectorId)
      : undefined;
  }, [selectedDbTable?.sectorId, sectors]);

  return (
    <div className="space-y-6">
      <FloorPlanToolbar
        onAddTable={() => setAddDialogOpen(true)}
        onSave={handleSave}
        onToggleEditMode={handleToggleEditMode}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        isEditMode={isEditMode}
      />

      <SectorSelector
        sectors={sectors}
        selectedSector={selectedSector ?? null}
        onSelectSector={(sectorId) => externalSetSelectedSector?.(sectorId)}
        onAddSector={onAddSector}
        onEditSector={onEditSector}
        onAddTable={onAddTable}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Floor Plan Canvas */}
        <div className="lg:col-span-3 relative">
          <FloorPlanCanvas
            tables={filteredTables}
            selectedTable={selectedTable}
            draggedTable={draggedTable}
            zoom={zoom}
            showGrid={showGrid}
            svgRef={svgRef}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onTableMouseDown={handleTableMouseDown}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleGrid={handleToggleGrid}
          />
        </div>

        {/* Properties Panel */}
        <div className="lg:col-span-1">
          <TablePropertiesPanel
            selectedTable={selectedTableData}
            tableName={selectedDbTable?.name}
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
          />
        </div>
      </div>

      <AddTableDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        tableNumber={newTable.number}
        tableName={newTable.name}
        tableShape={newTable.shape}
        tableCapacity={newTable.capacity}
        isShared={newTable.isShared}
        sectorId={newTable.sectorId}
        sectors={sectors}
        onTableNumberChange={(value) =>
          setNewTable({ ...newTable, number: value })
        }
        onTableNameChange={(value) => setNewTable({ ...newTable, name: value })}
        onTableShapeChange={(value) =>
          setNewTable({ ...newTable, shape: value })
        }
        onTableCapacityChange={(value) =>
          setNewTable({ ...newTable, capacity: value })
        }
        onIsSharedChange={(value) =>
          setNewTable({ ...newTable, isShared: value })
        }
        onSectorChange={(value) =>
          setNewTable({ ...newTable, sectorId: value })
        }
        onAddTable={addTable}
      />
    </div>
  );
}
