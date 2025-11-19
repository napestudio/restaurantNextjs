import { useCallback } from "react";
import type { TableShapeType, TableStatus } from "@/types/table";
import type { FloorTable, TableWithReservations } from "@/lib/floor-plan-utils";
import { shapeDefaults, reverseStatusMap } from "@/lib/floor-plan-utils";
import {
  updateTable,
  updateTableFloorPlan,
  updateFloorPlanBatch,
  deleteTable as deleteTableAction,
} from "@/actions/Table";
import { set } from "zod";

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

      // Just swap width and height for 90-degree rotation effect
      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                width: table.height,
                height: table.width,
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
      const defaults = shapeDefaults[shape];

      // Update local floor plan state
      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                shape,
                width: defaults.width,
                height: defaults.height,
              }
            : table
        )
      );

      setHasUnsavedChanges(true);
    },
    [setTables, setHasUnsavedChanges]
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
    (tableId: string, size: "normal" | "big") => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const defaults = shapeDefaults[table.shape];
      // Big tables use full scale (1x), normal tables are smaller (0.75x)
      const multiplier = size === "big" ? 1 : 0.75;

      const newWidth = defaults.width * multiplier;
      const newHeight = defaults.height * multiplier;

      // Calculate current center position
      const centerX = table.x + table.width / 2;
      const centerY = table.y + table.height / 2;

      // Calculate new top-left position to keep the table centered
      const newX = centerX - newWidth / 2;
      const newY = centerY - newHeight / 2;

      // Update local floor plan state with new size and recalculated position
      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
              }
            : t
        )
      );

      setHasUnsavedChanges(true);
    },
    [tables, setTables, setHasUnsavedChanges]
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
        const updates = tables.map((table) => ({
          id: table.id,
          positionX: table.x,
          positionY: table.y,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
          shape: table.shape,
        }));

        // Batch update all tables
        await updateFloorPlanBatch(updates);

        // Update parent state for simple view
        setDbTables((prevTables) =>
          prevTables.map((table) => {
            const updatedTable = tables.find((t) => t.id === table.id);
            if (updatedTable) {
              return {
                ...table,
                positionX: updatedTable.x,
                positionY: updatedTable.y,
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
