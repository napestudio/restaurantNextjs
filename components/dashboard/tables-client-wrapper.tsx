"use client";

import { useState, useEffect } from "react";
import { TablesTabs } from "./tables-tabs";
import { TablesSimpleView } from "./tables-simple-view";
import FloorPlanHandler from "./floor-plan-handler";
import { getSectorsByBranch } from "@/actions/Sector";
import { Button } from "@/components/ui/button";
import { Settings2, Plus } from "lucide-react";
import { AddSectorDialog } from "./floor-plan/add-sector-dialog";
import { EditSectorDialog } from "./floor-plan/edit-sector-dialog";
import { AddTableDialog } from "./floor-plan/add-table-dialog";
import { createTable } from "@/actions/Table";
import type { TableShapeType } from "@/types/table";

export interface TableWithReservations {
  id: string;
  number: number;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
  shape: string | null;
  status: string | null;
  isActive: boolean;
  isShared: boolean;
  sectorId: string | null;
  reservations: Array<{
    reservation: {
      customerName: string;
      people: number;
      status: string;
      date: string;
      timeSlot: {
        startTime: string;
        endTime: string;
      } | null;
    };
  }>;
}

interface TablesClientWrapperProps {
  branchId: string;
  initialTables: TableWithReservations[];
}

interface Sector {
  id: string;
  name: string;
  color: string;
  order: number;
  width: number;
  height: number;
  _count: {
    tables: number;
  };
}

const shapeDefaults = {
  CIRCLE: { width: 80, height: 80 },
  SQUARE: { width: 100, height: 100 },
  RECTANGLE: { width: 120, height: 80 },
  WIDE: { width: 200, height: 60 },
};

export function TablesClientWrapper({
  branchId,
  initialTables,
}: TablesClientWrapperProps) {
  const [tables, setTables] = useState<TableWithReservations[]>(initialTables);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [addSectorDialogOpen, setAddSectorDialogOpen] = useState(false);
  const [editSectorDialogOpen, setEditSectorDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    number: "",
    name: "",
    shape: "CIRCLE" as TableShapeType,
    capacity: "2",
    isShared: false,
    sectorId: "",
  });

  // Fetch sectors on mount
  useEffect(() => {
    const fetchSectors = async () => {
      const result = await getSectorsByBranch(branchId);
      if (result.success && result.data) {
        setSectors(result.data);
        // Set the first sector as default if not already selected
        if (result.data.length > 0 && !selectedSector) {
          setSelectedSector(result.data[0].id);
        }
      }
    };
    fetchSectors();
  }, [branchId]);

  const refreshSectors = async () => {
    const result = await getSectorsByBranch(branchId);
    if (result.success && result.data) {
      setSectors(result.data);
      // If current selected sector no longer exists, switch to the first one
      if (result.data.length > 0) {
        const stillExists = result.data.some((s) => s.id === selectedSector);
        if (!stillExists) {
          setSelectedSector(result.data[0].id);
        }
      }
    }
  };

  const addTable = async () => {
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

      setTables((prevTables) => [...prevTables, newDbTable]);
      setNewTable({
        number: "",
        name: "",
        shape: "CIRCLE",
        capacity: "2",
        isShared: false,
        sectorId: "",
      });
      setAddTableDialogOpen(false);
      refreshSectors();
    }
  };

  // Filter tables by selected sector
  const filteredTables = selectedSector
    ? tables.filter((table) => table.sectorId === selectedSector)
    : tables;

  return (
    <>
      <TablesTabs>
        <FloorPlanHandler
          branchId={branchId}
          tables={tables}
          setTables={setTables}
          selectedSector={selectedSector}
          setSelectedSector={setSelectedSector}
          sectors={sectors}
          onAddSector={() => setAddSectorDialogOpen(true)}
          onEditSector={(sector) => {
            setEditingSector(sector);
            setEditSectorDialogOpen(true);
          }}
          onAddTable={() => setAddTableDialogOpen(true)}
        />
        <TablesSimpleView tables={tables} sectors={sectors} />
      </TablesTabs>

      <AddSectorDialog
        open={addSectorDialogOpen}
        onOpenChange={setAddSectorDialogOpen}
        branchId={branchId}
        onSectorAdded={refreshSectors}
      />

      <EditSectorDialog
        open={editSectorDialogOpen}
        onOpenChange={setEditSectorDialogOpen}
        sector={editingSector}
        onSectorUpdated={refreshSectors}
        totalSectors={sectors.length}
      />

      <AddTableDialog
        open={addTableDialogOpen}
        onOpenChange={setAddTableDialogOpen}
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
    </>
  );
}
