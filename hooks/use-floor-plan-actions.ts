import { useCallback } from "react";
import type { TableShapeType, TableStatus } from "@/types/table";
import type { FloorTable, TableWithReservations } from "@/lib/floor-plan-utils";
import { shapeDefaults, reverseStatusMap } from "@/lib/floor-plan-utils";
import { GRID_SIZE } from "@/lib/floor-plan-constants";
import {
  updateTable,
  updateTableFloorPlan,
  updateFloorPlanBatch,
  deleteTable as deleteTableAction,
} from "@/actions/Table";

interface UseFloorPlanActionsProps {
  tables: FloorTable[];
  setTables: React.Dispatch<React.SetStateAction<FloorTable[]>>;
  setDbTables: React.Dispatch<React.SetStateAction<TableWithReservations[]>>;
  setSelectedTable: (id: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export function useFloorPlanActions({
  tables,
  setTables,
  setDbTables,
  setSelectedTable,
  setHasUnsavedChanges,
}: UseFloorPlanActionsProps) {
  const deleteTable = useCallback(
    async (tableId: string) => {
      const result = await deleteTableAction(tableId);

      if (result.success) {
        setTables((prevTables) => prevTables.filter((t) => t.id !== tableId));
        setDbTables((prevTables) => prevTables.filter((t) => t.id !== tableId));
        setSelectedTable(null);
      }
    },
    [setTables, setDbTables, setSelectedTable]
  );

  const rotateTable = useCallback(
    (tableId: string) => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      // Swap width and height for 90-degree rotation effect
      const newWidth = table.height;
      const newHeight = table.width;

      // Rotate around the top-left corner as pivot point
      // 1. Calculate current top-left from center
      const topLeftX = table.x - table.width / 2;
      const topLeftY = table.y - table.height / 2;

      // 2. Keep top-left fixed, calculate new center based on new dimensions
      const newCenterX = topLeftX + newWidth / 2;
      const newCenterY = topLeftY + newHeight / 2;

      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                width: newWidth,
                height: newHeight,
                x: newCenterX,
                y: newCenterY,
              }
            : t
        )
      );

      setHasUnsavedChanges(true);
    },
    [tables, setTables, setHasUnsavedChanges]
  );

  const updateTableStatus = useCallback(
    async (tableId: string, status: TableStatus) => {
      // Update local floor plan state
      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                status,
                currentGuests:
                  status === "empty" || status === "cleaning"
                    ? 0
                    : table.currentGuests,
              }
            : table
        )
      );

      // Update database
      await updateTableFloorPlan(tableId, {
        status: reverseStatusMap[status],
      });

      // Update parent state for simple view
      setDbTables((prevTables) =>
        prevTables.map((table) =>
          table.id === tableId
            ? { ...table, status: reverseStatusMap[status] }
            : table
        )
      );
    },
    [setTables, setDbTables]
  );

  const updateTableCapacity = useCallback(
    async (tableId: string, capacity: number) => {
      // Update local floor plan state
      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === tableId ? { ...table, capacity } : table
        )
      );

      // Update database
      await updateTable(tableId, { capacity });

      // Update parent state for simple view
      setDbTables((prevTables) =>
        prevTables.map((table) =>
          table.id === tableId ? { ...table, capacity } : table
        )
      );
    },
    [setTables, setDbTables]
  );

  const updateTableShape = useCallback(
    (tableId: string, shape: TableShapeType) => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const defaults = shapeDefaults[shape];
      const newWidth = defaults.width;
      const newHeight = defaults.height;

      // Re-snap center position based on new dimensions
      const spansMultipleCellsX = newWidth > GRID_SIZE;
      const spansMultipleCellsY = newHeight > GRID_SIZE;

      let snappedX: number;
      let snappedY: number;

      if (spansMultipleCellsX) {
        snappedX = Math.round(table.x / GRID_SIZE) * GRID_SIZE;
      } else {
        snappedX = Math.floor(table.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
      }

      if (spansMultipleCellsY) {
        snappedY = Math.round(table.y / GRID_SIZE) * GRID_SIZE;
      } else {
        snappedY = Math.floor(table.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
      }

      // Update local floor plan state
      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                shape,
                width: newWidth,
                height: newHeight,
                x: snappedX,
                y: snappedY,
              }
            : t
        )
      );

      setHasUnsavedChanges(true);
    },
    [tables, setTables, setHasUnsavedChanges]
  );

  const updateTableIsShared = useCallback(
    async (tableId: string, isShared: boolean) => {
      // Update local floor plan state
      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === tableId ? { ...table, isShared } : table
        )
      );

      // Update database
      await updateTable(tableId, { isShared });

      // Update parent state for simple view
      setDbTables((prevTables) =>
        prevTables.map((table) =>
          table.id === tableId ? { ...table, isShared } : table
        )
      );
    },
    [setTables, setDbTables]
  );

  const updateTableSize = useCallback(
    (tableId: string, size?: "normal" | "big") => {
      setTables((prevTables) =>
        prevTables.map((table) => {
          if (table.id !== tableId) return table;

          // Check if table is currently in vertical orientation (rotated)
          // For non-square shapes, vertical means height > width
          const isVertical = table.height > table.width;

          // Determine current size by comparing the larger dimension
          // Normal: 80/180/380, Big: 90/190/390
          const defaults = shapeDefaults[table.shape];
          const currentLargerDim = Math.max(table.width, table.height);
          const defaultLargerDim = Math.max(defaults.width, defaults.height);
          const isCurrentlyBig = currentLargerDim > defaultLargerDim;

          // If size is specified, use it; otherwise toggle
          const makeBig = size ? size === "big" : !isCurrentlyBig;

          // If already at target size, do nothing
          if ((makeBig && isCurrentlyBig) || (!makeBig && !isCurrentlyBig)) {
            return table;
          }

          let baseWidth: number;
          let baseHeight: number;

          if (makeBig) {
            // Big size
            switch (table.shape) {
              case "CIRCLE":
              case "SQUARE":
                baseWidth = 90;
                baseHeight = 90;
                break;
              case "RECTANGLE":
                baseWidth = 190;
                baseHeight = 90;
                break;
              case "WIDE":
                baseWidth = 390;
                baseHeight = 95;
                break;
            }
          } else {
            // Normal size: use shapeDefaults
            baseWidth = defaults.width;
            baseHeight = defaults.height;
          }

          // Preserve current orientation - swap if table is vertical
          const newWidth = isVertical ? baseHeight : baseWidth;
          const newHeight = isVertical ? baseWidth : baseHeight;

          // Keep center position fixed when resizing - table grows/shrinks around its center
          return {
            ...table,
            width: newWidth,
            height: newHeight,
          };
        })
      );

      setHasUnsavedChanges(true);
    },
    [setTables, setHasUnsavedChanges]
  );

  const saveFloorPlanChanges = useCallback(
    async (
      setIsSaving: (value: boolean) => void,
      setHasUnsavedChangesLocal: (value: boolean) => void,
      setIsEditMode: (value: boolean) => void
    ) => {
      setIsSaving(true);
      try {
        // Prepare batch update data
        // Convert center coordinates to top-left for database
        const updates = tables.map((table) => ({
          id: table.id,
          positionX: table.x - table.width / 2,
          positionY: table.y - table.height / 2,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
          shape: table.shape,
        }));

        // Batch update all tables
        await updateFloorPlanBatch(updates);

        // Update parent state for simple view (DB format with top-left)
        setDbTables((prevTables) =>
          prevTables.map((table) => {
            const updatedTable = tables.find((t) => t.id === table.id);
            if (updatedTable) {
              return {
                ...table,
                positionX: updatedTable.x - updatedTable.width / 2,
                positionY: updatedTable.y - updatedTable.height / 2,
                width: updatedTable.width,
                height: updatedTable.height,
                rotation: updatedTable.rotation,
                shape: updatedTable.shape,
              };
            }
            return table;
          })
        );

        setHasUnsavedChangesLocal(false);
      } catch (error) {
        console.error("Error saving floor plan changes:", error);
      } finally {
        setIsSaving(false);
        setIsEditMode(false);
      }
    },
    [tables, setDbTables]
  );

  return {
    deleteTable,
    rotateTable,
    updateTableStatus,
    updateTableCapacity,
    updateTableShape,
    updateTableIsShared,
    updateTableSize,
    saveFloorPlanChanges,
  };
}
