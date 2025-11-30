import { useState, useEffect, useMemo, useCallback } from "react";
import type { FloorTable, TableWithReservations } from "@/lib/floor-plan-utils";
import {
  transformTables,
  calculateTableStatus,
  snapToGrid,
  constrainToBounds,
} from "@/lib/floor-plan-utils";

interface UseFloorPlanStateProps {
  dbTables: TableWithReservations[];
  selectedSector: string | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
}

export function useFloorPlanState({
  dbTables,
  selectedSector,
  canvasWidth,
  canvasHeight,
  zoom,
}: UseFloorPlanStateProps) {
  // Initialize tables state with a function to avoid computing on every render
  const [tables, setTables] = useState<FloorTable[]>(() =>
    transformTables(dbTables)
  );
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Sync floor plan tables when dbTables change (e.g., new reservations)
  // Note: DB stores top-left, FloorTable uses center coordinates
  useEffect(() => {
    setTables((prevTables) => {
      return dbTables.map((dbTable) => {
        // Find existing floor table to preserve position/UI state
        const existingFloorTable = prevTables.find((t) => t.id === dbTable.id);
        const { status, currentGuests } = calculateTableStatus(dbTable);

        // If table exists, preserve floor plan properties but update status
        if (existingFloorTable) {
          return {
            ...existingFloorTable,
            number: dbTable.number,
            capacity: dbTable.capacity,
            status,
            currentGuests,
            isShared: dbTable.isShared,
          };
        }

        // New table - convert DB top-left to center coordinates
        const width = dbTable.width ?? 80;
        const height = dbTable.height ?? 80;
        const topLeftX = dbTable.positionX ?? 100;
        const topLeftY = dbTable.positionY ?? 100;

        return {
          id: dbTable.id,
          number: dbTable.number,
          // Convert to center coordinates
          x: topLeftX + width / 2,
          y: topLeftY + height / 2,
          width,
          height,
          rotation: dbTable.rotation ?? 0,
          shape: (dbTable.shape ?? "SQUARE") as any,
          capacity: dbTable.capacity,
          status,
          currentGuests,
          isShared: dbTable.isShared,
        };
      });
    });
  }, [dbTables]);

  // Filter tables by selected sector - memoized
  // Apply filter eagerly to prevent flickering on first render
  const filteredTables = useMemo(() => {
    if (!selectedSector) return tables;

    return tables.filter((table) => {
      const dbTable = dbTables.find((t) => t.id === table.id);
      return dbTable?.sectorId === selectedSector;
    });
  }, [tables, selectedSector, dbTables]);

  // IMPORTANT: Return filtered tables directly in the canvas to avoid flicker
  // The canvas should always receive pre-filtered tables based on selectedSector

  // Get selected table data - memoized
  const selectedTableData = useMemo(() => {
    return tables.find((t) => t.id === selectedTable);
  }, [tables, selectedTable]);

  // Handle table drag - snap center to grid cell center like a videogame
  // Note: table.x and table.y are CENTER coordinates
  const handleTableDrag = useCallback(
    (clientX: number, clientY: number, svgRect: DOMRect) => {
      if (!draggedTable) return;

      const x = (clientX - svgRect.left) / zoom;
      const y = (clientY - svgRect.top) / zoom;

      setTables((prevTables) =>
        prevTables.map((table) => {
          if (table.id !== draggedTable) return table;

          // Calculate raw center position (dragOffset is relative to center now)
          const rawCenterX = x - dragOffset.x;
          const rawCenterY = y - dragOffset.y;

          // Snap center to grid cell center (50, 150, 250, ...)
          const GRID_SIZE = 100;

          // For tables that span multiple cells, snap to appropriate grid positions
          // If table width is greater than grid size, snap center to grid line (0, 100, 200...)
          // Otherwise snap to cell center (50, 150, 250...)
          const tableSpansMultipleCellsX = table.width > GRID_SIZE;
          const tableSpansMultipleCellsY = table.height > GRID_SIZE;

          let snappedCenterX: number;
          let snappedCenterY: number;

          if (tableSpansMultipleCellsX) {
            // Snap to grid lines for wide tables
            snappedCenterX = Math.round(rawCenterX / GRID_SIZE) * GRID_SIZE;
          } else {
            // Snap to cell center for narrow tables
            snappedCenterX = Math.floor(rawCenterX / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
          }

          if (tableSpansMultipleCellsY) {
            // Snap to grid lines for tall tables
            snappedCenterY = Math.round(rawCenterY / GRID_SIZE) * GRID_SIZE;
          } else {
            // Snap to cell center for short tables
            snappedCenterY = Math.floor(rawCenterY / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
          }

          // Calculate bounds - ensure table stays on valid grid positions
          // For tables snapping to cell centers (50, 150, 250...), min is 50 and max depends on canvas
          // For tables snapping to grid lines (0, 100, 200...), min is 0 or 100 depending on table size
          const minX = tableSpansMultipleCellsX ? GRID_SIZE : GRID_SIZE / 2;
          const minY = tableSpansMultipleCellsY ? GRID_SIZE : GRID_SIZE / 2;

          // Calculate max position that keeps table in bounds AND on grid
          const maxCellsX = Math.floor((canvasWidth - table.width / 2) / GRID_SIZE);
          const maxCellsY = Math.floor((canvasHeight - table.height / 2) / GRID_SIZE);
          const maxX = tableSpansMultipleCellsX
            ? maxCellsX * GRID_SIZE
            : maxCellsX * GRID_SIZE + GRID_SIZE / 2;
          const maxY = tableSpansMultipleCellsY
            ? maxCellsY * GRID_SIZE
            : maxCellsY * GRID_SIZE + GRID_SIZE / 2;

          // Constrain to valid grid positions
          const constrainedX = constrainToBounds(snappedCenterX, minX, maxX);
          const constrainedY = constrainToBounds(snappedCenterY, minY, maxY);

          return {
            ...table,
            x: constrainedX,
            y: constrainedY,
          };
        })
      );
    },
    [draggedTable, dragOffset, zoom, canvasWidth, canvasHeight]
  );

  return {
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
  };
}
