"use client";

import { useState, useMemo, useCallback } from "react";
import { TablesTabs } from "./tables-tabs";
import { TablesSimpleView } from "./tables-simple-view";
import FloorPlanHandler from "./floor-plan-handler";
import { AddSectorDialog } from "./floor-plan/add-sector-dialog";
import { EditSectorDialog } from "./floor-plan/edit-sector-dialog";
import { AddTableDialog } from "./floor-plan/add-table-dialog";
import { useSectors } from "@/hooks/use-sectors";
import { useDialogs } from "@/hooks/use-dialogs";
import { useTableForm } from "@/hooks/use-table-form";
import { getTablesWithStatus, getTableWithStatus } from "@/actions/Table";
import type { TableWithReservations, Sector } from "@/types/tables-client";
import { ProductsProvider } from "@/contexts/products-context";
import { OrderType } from "@/app/generated/prisma";

// Re-export for backward compatibility
export type { TableWithReservations };

interface TablesClientWrapperProps {
  branchId: string;
  initialTables: TableWithReservations[];
  initialSectors: Sector[];
  editModeOnly?: boolean;
}

export function TablesClientWrapper({
  branchId,
  initialTables,
  initialSectors,
  editModeOnly = false,
}: TablesClientWrapperProps) {
  const [tables, setTables] = useState<TableWithReservations[]>(initialTables);

  // Custom hooks for state management
  const {
    sectors,
    selectedSector,
    setSelectedSector,
    sectorsLoaded,
    refreshSectors,
  } = useSectors(branchId, initialSectors);

  const {
    state: dialogState,
    openAddSector,
    closeAddSector,
    openEditSector,
    closeEditSector,
    closeAddTable,
  } = useDialogs();

  const { formState, updateField, submitTable } = useTableForm(branchId);

  // Memoized filtered tables calculation
  useMemo(
    () =>
      selectedSector
        ? tables.filter((table) => table.sectorId === selectedSector)
        : tables,
    [tables, selectedSector]
  );

  // Refresh tables data from server
  const refreshTables = useCallback(async () => {
    const tablesResult = await getTablesWithStatus(branchId);
    if (tablesResult.success && tablesResult.data) {
      // Serialize dates for client components
      const serializedTables = tablesResult.data.map((table) => ({
        ...table,
        reservations: table.reservations.map((res) => ({
          ...res,
          reservation: {
            ...res.reservation,
            date: res.reservation.date.toISOString(),
            timeSlot: res.reservation.timeSlot
              ? {
                  startTime: res.reservation.timeSlot.startTime.toISOString(),
                  endTime: res.reservation.timeSlot.endTime.toISOString(),
                }
              : null,
          },
        })),
      }));
      setTables(serializedTables);
    }
  }, [branchId]);

  // Refresh only a specific table (more efficient than refreshing all)
  const refreshSingleTable = useCallback(async (tableId: string) => {
    const tableResult = await getTableWithStatus(tableId);
    if (tableResult.success && tableResult.data) {
      const updatedTable = tableResult.data;

      // Serialize the updated table
      const serializedTable = {
        ...updatedTable,
        reservations: updatedTable.reservations.map((res) => ({
          ...res,
          reservation: {
            ...res.reservation,
            date: res.reservation.date.toISOString(),
            timeSlot: res.reservation.timeSlot
              ? {
                  startTime: res.reservation.timeSlot.startTime.toISOString(),
                  endTime: res.reservation.timeSlot.endTime.toISOString(),
                }
              : null,
          },
        })),
      };

      // Update only the specific table in state
      setTables((prevTables) =>
        prevTables.map((t) => (t.id === tableId ? serializedTable : t))
      );
    }
  }, []);

  // Memoized callback for adding table
  const handleAddTable = useCallback(async () => {
    const success = await submitTable((newTable) => {
      setTables((prevTables) => [...prevTables, newTable]);
    });

    if (success) {
      closeAddTable();
      refreshSectors();
    }
  }, [submitTable, closeAddTable, refreshSectors]);

  return (
    <ProductsProvider branchId={branchId} orderType={OrderType.DINE_IN}>
      <TablesTabs>
        <FloorPlanHandler
          branchId={branchId}
          tables={tables}
          setTables={setTables}
          selectedSector={selectedSector}
          setSelectedSector={setSelectedSector}
          sectors={sectors}
          onAddSector={openAddSector}
          onEditSector={openEditSector}
          onRefreshTables={refreshTables}
          onRefreshSingleTable={refreshSingleTable}
          editModeOnly={editModeOnly}
          isLoading={!sectorsLoaded}
        />
        <TablesSimpleView tables={tables} sectors={sectors} />
      </TablesTabs>

      <AddSectorDialog
        open={dialogState.addSector}
        onOpenChange={closeAddSector}
        branchId={branchId}
        onSectorAdded={refreshSectors}
      />

      <EditSectorDialog
        open={dialogState.editSector}
        onOpenChange={closeEditSector}
        sector={dialogState.editingSector}
        onSectorUpdated={refreshSectors}
        totalSectors={sectors.length}
      />

      <AddTableDialog
        open={dialogState.addTable}
        onOpenChange={closeAddTable}
        tableNumber={formState.number}
        tableShape={formState.shape}
        tableCapacity={formState.capacity}
        isShared={formState.isShared}
        onTableNumberChange={(value) => updateField("number", value)}
        onTableShapeChange={(value) => updateField("shape", value)}
        onTableCapacityChange={(value) => updateField("capacity", value)}
        onIsSharedChange={(value) => updateField("isShared", value)}
        onAddTable={handleAddTable}
      />
    </ProductsProvider>
  );
}
