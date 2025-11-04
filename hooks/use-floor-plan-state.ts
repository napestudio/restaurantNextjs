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

        // New table - use transform logic
        return {
          id: dbTable.id,
          number: dbTable.number,
          x: dbTable.positionX ?? 100,
          y: dbTable.positionY ?? 100,
          width: dbTable.width ?? 80,
          height: dbTable.height ?? 80,
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

  // Handle table drag
  const handleTableDrag = useCallback(
    (clientX: number, clientY: number, svgRect: DOMRect) => {
      if (!draggedTable) return;

      const x = (clientX - svgRect.left) / zoom;
      const y = (clientY - svgRect.top) / zoom;

      setTables((prevTables) =>
        prevTables.map((table) => {
          if (table.id !== draggedTable) return table;

          // Calculate raw top-left position
          const rawX = x - dragOffset.x;
          const rawY = y - dragOffset.y;

          // Snap to 100px grid (one cell at a time)
          const snappedX = snapToGrid(rawX);
          const snappedY = snapToGrid(rawY);

          // Constrain to canvas bounds
          const constrainedX = constrainToBounds(
            snappedX,
            0,
            canvasWidth - table.width
          );
          const constrainedY = constrainToBounds(
            snappedY,
            0,
            canvasHeight - table.height
          );

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
