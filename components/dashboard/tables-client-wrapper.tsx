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
import { getTablesWithStatus } from "@/actions/Table";
import type { TableWithReservations } from "@/types/tables-client";

// Re-export for backward compatibility
export type { TableWithReservations };

interface TablesClientWrapperProps {
  branchId: string;
  initialTables: TableWithReservations[];
}

export function TablesClientWrapper({
  branchId,
  initialTables,
}: TablesClientWrapperProps) {
  const [tables, setTables] = useState<TableWithReservations[]>(initialTables);

  // Custom hooks for state management
  const {
    sectors,
    selectedSector,
    setSelectedSector,
    sectorsLoaded,
    refreshSectors,
  } = useSectors(branchId);

  const {
    state: dialogState,
    openAddSector,
    closeAddSector,
    openEditSector,
    closeEditSector,
    openAddTable,
    closeAddTable,
  } = useDialogs();

  const { formState, updateField, submitTable } = useTableForm(branchId);

  // Memoized filtered tables calculation
  const filteredTables = useMemo(
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
    <>
      <TablesTabs>
        {/* Only render FloorPlanHandler after sectors are loaded to prevent flicker */}
        {sectorsLoaded ? (
          <FloorPlanHandler
            branchId={branchId}
            tables={tables}
            setTables={setTables}
            selectedSector={selectedSector}
            setSelectedSector={setSelectedSector}
            sectors={sectors}
            onAddSector={openAddSector}
            onEditSector={openEditSector}
            onAddTable={openAddTable}
            onRefreshTables={refreshTables}
          />
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-muted-foreground">Cargando plano...</div>
          </div>
        )}
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
        tableName={formState.name}
        tableShape={formState.shape}
        tableCapacity={formState.capacity}
        isShared={formState.isShared}
        sectorId={formState.sectorId}
        sectors={sectors}
        onTableNumberChange={(value) => updateField("number", value)}
        onTableNameChange={(value) => updateField("name", value)}
        onTableShapeChange={(value) => updateField("shape", value)}
        onTableCapacityChange={(value) => updateField("capacity", value)}
        onIsSharedChange={(value) => updateField("isShared", value)}
        onSectorChange={(value) => updateField("sectorId", value)}
        onAddTable={handleAddTable}
      />
    </>
  );
}
